// Freeze existing pre-encoded tensors, bypassing tokenizer differences at run time.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WordPiece } from '../../web/tokenizer.js';
const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const reference = JSON.parse(read('out/reference.json'));
const vocab = read('out/vocab.txt');
const tokenizer = new WordPiece(vocab, { maxLength: 128 });
const fixtures = reference.map((ref, i) => {
  const encoded = tokenizer.encode(ref.text);
  const ids = Array.from(encoded.inputIds, Number);
  const mask = Array.from(encoded.attentionMask, Number);
  if (JSON.stringify(ids.slice(0, ref.ids.length)) !== JSON.stringify(ref.ids)) throw new Error(`token mismatch: ${i}`);
  if (encoded.truncated) throw new Error(`unexpected truncation: ${i}`);
  return { id: `smoke-${i}`, dims: [1, ids.length], input_ids: ids, attention_mask: mask,
    real_positions_including_special: ref.ids.length, reference_native_int8: ref.argmax,
    reference_native_fp32: ref.argmax_fp32 };
});
const artifact = {
  evidence_kind: 'frozen_inputs_from_historical_reference_not_new_predictions',
  pinned_ort_web: JSON.parse(read('package-lock.json')).packages['node_modules/onnxruntime-web'].version,
  original_int8_sha256: read('out/airlock-ner.int8.onnx.sha256').trim(),
  vocab_sha256: createHash('sha256').update(vocab).digest('hex'), fixtures,
};
writeFileSync(new URL('./inputs.json', import.meta.url), JSON.stringify(artifact, null, 2) + '\n');
console.log(`Prepared ${fixtures.length} fixtures; ${fixtures.reduce((n, f) => n + f.real_positions_including_special, 0)} non-padding positions including special tokens.`);
