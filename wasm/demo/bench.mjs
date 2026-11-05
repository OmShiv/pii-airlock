// Opens each copy of the demo page in Chrome and saves what the page measured
// to out/wasm-csp-results.json.
import { writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';
import { POLICIES, MOUNT } from './policies.mjs';

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const server = await serve();
const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const runs = [];
for (const p of POLICIES) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:8791${MOUNT}${p.dir ? `${p.dir}/` : ''}`);
  await page.waitForSelector('body[data-done="1"]', { timeout: 60000 });
  runs.push({ page: p.id, csp: p.csp, ...(await page.evaluate(() => window.__results)) });
  await page.close();
}
const version = await browser.version();
await browser.close();
server.close();
const report = { date: new Date().toISOString(), browser: version, runs };
await writeFile(new URL('../out/wasm-csp-results.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
