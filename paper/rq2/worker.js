// Diagnostic worker. It does not authorize network transmission.
import * as ort from '/ort/ort.all.min.mjs';

const hex = (bytes) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const checkedFetch = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`fetch ${url}: HTTP ${response.status}`);
  return response;
};

self.onmessage = async ({ data: config }) => {
  let session;
  const result = { config, started_utc: new Date().toISOString(), isolated: self.crossOriginIsolated, runs: [] };
  try {
    ort.env.wasm.wasmPaths = '/ort/';
    ort.env.wasm.numThreads = config.threads;
    ort.env.debug = true;
    ort.env.logLevel = 'verbose';
    result.runtime_versions = ort.env.versions ?? null;
    let adapter = null;
    try { adapter = self.navigator.gpu ? await self.navigator.gpu.requestAdapter() : null; }
    catch (error) { result.adapter_probe_error = String(error); }
    result.gpu = adapter ? { info: { vendor: adapter.info?.vendor, architecture: adapter.info?.architecture,
      description: adapter.info?.description, fallback: adapter.info?.isFallbackAdapter }, features: [...adapter.features] } : null;
    const startFetch = performance.now();
    const response = await checkedFetch(config.model);
    const bytes = new Uint8Array(await response.arrayBuffer());
    result.fetch_ms = performance.now() - startFetch;
    const startHash = performance.now();
    result.model_sha256 = hex(await crypto.subtle.digest('SHA-256', bytes));
    result.hash_ms = performance.now() - startHash;
    result.model_bytes = bytes.byteLength;
    if (result.model_sha256 !== config.expectedSha) throw new Error('model SHA-256 mismatch');
    const startCreate = performance.now();
    session = await ort.InferenceSession.create(bytes, {
      executionProviders: [config.ep], graphOptimizationLevel: config.optimization, enableProfiling: true,
    });
    result.create_ms = performance.now() - startCreate;
    result.inputs = session.inputNames;
    result.outputs = session.outputNames;
    for (const f of config.fixtures) {
      if (f.input_ids.length !== f.dims[0] * f.dims[1] || f.attention_mask.length !== f.input_ids.length) throw new Error('invalid fixture shape');
      const feeds = {
        input_ids: new ort.Tensor('int64', BigInt64Array.from(f.input_ids, BigInt), f.dims),
        attention_mask: new ort.Tensor('int64', BigInt64Array.from(f.attention_mask, BigInt), f.dims),
      };
      for (let repeat = 0; repeat < config.repeats; repeat++) {
        const start = performance.now();
        const outputs = await session.run(feeds);
        const logits = outputs.logits;
        if (!logits) throw new Error('missing logits output');
        const values = Array.from(logits.data, Number); // includes CPU readback in end-to-end timer
        const ms = performance.now() - start;
        const validShape = logits.type === 'float32' && logits.dims.length === 3 && logits.dims[0] === 1 && logits.dims[1] === f.dims[1] && logits.dims[2] === 9 && values.length === f.dims[1] * 9;
        const nonfinite = values.flatMap((v, i) => Number.isFinite(v) ? [] : [i]);
        const row = { fixture_id: f.id, repeat, ms_including_readback: ms, dims: [...logits.dims], type: logits.type, valid_shape: validShape,
          nonfinite_indices: nonfinite, logits: values.map(v => Number.isFinite(v) ? v : null) };
        if (validShape && nonfinite.length === 0) {
          row.argmax = Array.from({ length: f.dims[1] }, (_, i) => {
            let best = 0;
            for (let k = 1; k < 9; k++) if (values[i * 9 + k] > values[i * 9 + best]) best = k;
            return best;
          });
          const n = f.real_positions_including_special;
          row.agreement_native_int8 = { same: row.argmax.slice(0, n).filter((v, i) => v === f.reference_native_int8[i]).length, total: n };
          row.agreement_native_fp32 = { same: row.argmax.slice(0, n).filter((v, i) => v === f.reference_native_fp32[i]).length, total: n };
        }
        result.runs.push(row);
        Object.values(outputs).forEach(t => t.dispose?.());
      }
      Object.values(feeds).forEach(t => t.dispose?.());
    }
    result.ok = true;
    result.placement_verified = false; // must be established from captured runtime logs/traces
  } catch (error) {
    result.ok = false;
    result.error = String(error?.stack ?? error);
  } finally {
    try { await session?.release(); } catch (error) { result.release_error = String(error); }
    self.postMessage(result);
    self.close();
  }
};
