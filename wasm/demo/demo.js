// Runs the rule engine as JavaScript and as WebAssembly on the same inputs,
// reports whether the page's policy let the WebAssembly compile, and times both.
import { structuredSpans, mergeSpans, createVault, pseudonymize } from './airlock.js';
import { loadAirlockWasm } from './airlock-wasm.js';

const violations = [];
document.addEventListener('securitypolicyviolation', (e) => {
  violations.push(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline code'}`);
});

const $ = (id) => document.getElementById(id);
const redactJs = (text) => pseudonymize(text, mergeSpans(text, structuredSpans(text)), createVault());
const lines = async (name) => (await (await fetch(new URL(name, import.meta.url))).text()).split('\n').filter(Boolean);
const passMs = (fn, inputs, reps) => {
  const t = performance.now();
  for (let r = 0; r < reps; r++) for (const s of inputs) fn(s);
  return (performance.now() - t) / reps;
};
const REPS = 300;

const sentences = await lines('sentences.txt');
const cases = await lines('cases.txt');
const results = { policy: document.body.dataset.policy, userAgent: navigator.userAgent, inputs: sentences.length + cases.length, reps: REPS, violations };

passMs(redactJs, sentences, 30);
results.js = { msPerPass: passMs(redactJs, sentences, REPS) };

let wasm = null;
try {
  wasm = await loadAirlockWasm(new URL('airlock-rules.wasm', import.meta.url).href);
  let mismatches = 0;
  for (const s of [...sentences, ...cases]) if (wasm.redact(s) !== redactJs(s)) mismatches++;
  passMs(wasm.redact, sentences, 30);
  results.wasm = { status: 'ran', compileMs: wasm.compileMs, instantiateMs: wasm.instantiateMs, mismatches, msPerPass: passMs(wasm.redact, sentences, REPS) };
} catch (e) {
  results.wasm = { status: 'blocked', error: `${e.name}: ${e.message}` };
}
await new Promise((resolve) => setTimeout(resolve, 50)); // violation events arrive asynchronously

const ms = (v) => `${v.toFixed(3)} ms`;
const rows = [
  ['JavaScript build', '<span class="ok">ran</span>'],
  [`JavaScript, one pass over ${sentences.length} sentences`, ms(results.js.msPerPass)],
];
if (results.wasm.status === 'ran') {
  rows.push(
    ['WebAssembly build', '<span class="ok">compiled and ran</span>'],
    [`WebAssembly, one pass over ${sentences.length} sentences`, ms(results.wasm.msPerPass)],
    ['WebAssembly download and compile', ms(results.wasm.compileMs)],
    ['WebAssembly instantiate and initialize', ms(results.wasm.instantiateMs)],
    [`Outputs that differ from JavaScript (of ${results.inputs})`, String(results.wasm.mismatches)],
  );
} else {
  rows.push(['WebAssembly build', '<span class="bad">blocked</span>'], ['Error', results.wasm.error]);
}
rows.push(['Policy violations reported', violations.length ? violations.join('<br>') : 'none']);
$('results').tBodies[0].replaceChildren(...rows.map(([k, v]) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
  return tr;
}));

$('run').addEventListener('click', () => {
  const text = $('input').value;
  const out = [['JavaScript', redactJs(text)], ['WebAssembly', wasm ? wasm.redact(text) : 'not available: the policy blocked compilation']];
  $('outputs').replaceChildren(...out.flatMap(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    return [dt, dd];
  }));
});
$('run').click();

window.__results = results;
document.body.dataset.done = '1';
