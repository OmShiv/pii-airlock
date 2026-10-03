// Runs web/bench.html in headless Chrome and saves the results.
// Usage: npm run serve (in another terminal), then: node tools/bench.mjs out/browser-results.json
// Set CHROME to your Chrome binary if it isn't in the default macOS location.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=WebGPU'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:8790/web/bench.html');
await page.waitForFunction('window.done === true', { timeout: 300000 });
const results = await page.evaluate(() => window.results);
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ...results, runs: results.runs.map((r) => ({ ...r, examples: r.examples ? `${r.examples.length} examples` : undefined })) }, null, 2));
await browser.close();
