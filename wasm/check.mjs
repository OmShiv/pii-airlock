// Runs the JavaScript and WebAssembly builds of the rule engine on the same
// inputs and reports any difference, then times both.
import { readFile } from 'node:fs/promises';
import { structuredSpans, mergeSpans, createVault, pseudonymize } from '../web/airlock.js';
import { loadAirlockWasm } from './web/airlock-wasm.js';

const redactJs = (text) => pseudonymize(text, mergeSpans(text, structuredSpans(text)), createVault());
const sentences = (await readFile(new URL('../data/sentences.txt', import.meta.url), 'utf8')).split('\n').filter(Boolean);
const extra = (await readFile(new URL('./cases.txt', import.meta.url), 'utf8')).split('\n').filter(Boolean);
const wasm = await loadAirlockWasm(await readFile(new URL('./out/airlock-rules.wasm', import.meta.url)));

let diffs = 0;
for (const text of [...sentences, ...extra]) {
  const a = redactJs(text);
  let b;
  try { b = wasm.redact(text); } catch (e) { b = `THREW ${e.message}`; }
  if (a !== b) {
    diffs++;
    console.log(`DIFF\n  in:   ${text}\n  js:   ${a}\n  wasm: ${b}`);
  }
}
console.log(`${sentences.length + extra.length} inputs, ${diffs} differ`);

const time = (fn, reps) => { const t = performance.now(); for (let r = 0; r < reps; r++) for (const s of sentences) fn(s); return (performance.now() - t) / reps; };
time(redactJs, 50); time(wasm.redact, 50); // warm up
console.log(`per pass over ${sentences.length} sentences: js ${time(redactJs, 500).toFixed(3)} ms, wasm ${time(wasm.redact, 500).toFixed(3)} ms`);
console.log(`compile ${wasm.compileMs.toFixed(1)} ms, instantiate ${wasm.instantiateMs.toFixed(1)} ms`);
