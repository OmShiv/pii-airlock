// Writes the three demo pages and their shared assets into wasm/site/, laid out
// as they will be served under /demos/wasm-csp/, plus a _headers fragment.
import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { POLICIES, MOUNT } from './policies.mjs';

const here = (p) => new URL(p, import.meta.url);
const out = (p = '') => new URL(`../site${MOUNT}${p}`, import.meta.url);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const scriptc = JSON.parse(await readFile(here('../node_modules/scriptc/package.json'), 'utf8')).version;

await rm(new URL('../site', import.meta.url), { recursive: true, force: true });
await mkdir(out('assets'), { recursive: true });
for (const [from, to] of [
  ['../../web/airlock.js', 'airlock.js'],
  ['../web/airlock-wasm.js', 'airlock-wasm.js'],
  ['../out/airlock-rules.wasm', 'airlock-rules.wasm'],
  ['../../data/sentences.txt', 'sentences.txt'],
  ['../cases.txt', 'cases.txt'],
  ['demo.js', 'demo.js'],
  ['demo.css', 'demo.css'],
]) await copyFile(here(from), out(`assets/${to}`));

const template = await readFile(here('template.html'), 'utf8');
for (const p of POLICIES) {
  const links = POLICIES.map((q) => `<li${q === p ? ' class="current"' : ''}><a href="${MOUNT}${q.dir ? `${q.dir}/` : ''}">${esc(q.label)}</a></li>`).join('');
  const html = template
    .replaceAll('{{ROOT}}', MOUNT)
    .replaceAll('{{ID}}', p.id)
    .replaceAll('{{SCRIPTC}}', scriptc)
    .replaceAll('{{LINKS}}', links)
    .replaceAll('{{LABEL}}', esc(p.label))
    .replaceAll('{{CSP}}', p.csp ? esc(p.csp) : 'No Content-Security-Policy header.');
  await mkdir(out(p.dir), { recursive: true });
  await writeFile(out(`${p.dir ? `${p.dir}/` : ''}index.html`), html);
}

const headers = POLICIES.filter((p) => p.csp).map((p) => `${MOUNT}${p.dir}/*\n  Content-Security-Policy: ${p.csp}\n`).join('\n');
await writeFile(new URL('../site/_headers', import.meta.url), headers);
console.log(`built ${POLICIES.length} pages with scriptc ${scriptc}`);
