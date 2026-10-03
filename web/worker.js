// Runs the NER model in a dedicated worker, so tokenizing and inference never
// block the page. Text in, spans out; the vault never comes in here.
import * as ort from '/ort/ort.all.min.mjs';
import { nerSpans } from './airlock.js';
import { WordPiece } from './tokenizer.js';

let session;
let tokenizer;
let labels;

async function verifiedBytes(url, sha256) {
  const cache = await caches.open('airlock-models-v1');
  let response = await cache.match(url);
  if (!response) {
    response = await fetch(url);
    if (!response.ok) throw new Error(`model download failed: ${response.status}`);
    await cache.put(url, response.clone());
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
  if (sha256 && digest !== sha256) {
    await cache.delete(url);
    throw new Error('model hash mismatch: refusing to run it');
  }
  return bytes;
}

async function init({ modelUrl, modelSha256, vocabUrl, labelsUrl, executionProvider, threads }) {
  ort.env.wasm.wasmPaths = '/ort/';
  ort.env.wasm.numThreads = threads;
  const [model, vocab, labelList] = await Promise.all([
    verifiedBytes(modelUrl, modelSha256),
    fetch(vocabUrl).then((r) => r.text()),
    fetch(labelsUrl).then((r) => r.json()),
  ]);
  tokenizer = new WordPiece(vocab, { maxLength: 128 });
  labels = labelList;
  session = await ort.InferenceSession.create(model, {
    executionProviders: [executionProvider],
    graphOptimizationLevel: 'all',
  });
}

async function detect(text) {
  const encoded = tokenizer.encode(text);
  const feeds = {
    input_ids: new ort.Tensor('int64', encoded.inputIds, [1, encoded.inputIds.length]),
    attention_mask: new ort.Tensor('int64', encoded.attentionMask, [1, encoded.attentionMask.length]),
  };
  const started = performance.now();
  const { logits } = await session.run(feeds);
  const ms = performance.now() - started;
  const data = logits.data;
  const argmax = [];
  for (let i = 0; i < encoded.tokens.length + 2; i++) {
    let best = 0;
    for (let k = 1; k < labels.length; k++) if (data[i * labels.length + k] > data[i * labels.length + best]) best = k;
    argmax.push(best);
  }
  return { spans: nerSpans(text, encoded, data, labels), argmax, ms, truncated: encoded.truncated };
}

// Runs golden inputs on the chosen backend and compares labels with what
// PyTorch produced at export time. A backend that disagrees doesn't get used.
async function selfTest(goldens) {
  let same = 0;
  let total = 0;
  for (const golden of goldens) {
    const { argmax } = await detect(golden.text);
    golden.labels.forEach((label, i) => {
      total++;
      if (argmax[i] === label) same++;
    });
  }
  return same / total;
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const started = performance.now();
      await init(data);
      self.postMessage({ id: data.id, ok: true, ms: performance.now() - started, isolated: self.crossOriginIsolated });
    } else if (data.type === 'selftest') {
      self.postMessage({ id: data.id, ok: true, agreement: await selfTest(data.goldens) });
    } else if (data.type === 'detect') {
      self.postMessage({ id: data.id, ok: true, ...(await detect(data.text)) });
    }
  } catch (error) {
    self.postMessage({ id: data.id, ok: false, error: String(error?.message ?? error) });
  }
};
