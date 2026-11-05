# The airlock's rules as WebAssembly

The rule engine in [`../web/airlock.js`](../web/airlock.js) (emails, IBANs, card numbers, phone numbers) compiled to WebAssembly with [scriptc](https://github.com/vercel-labs/scriptc) 0.4.8, and a page that runs both builds under three Content Security Policies. [`rules.ts`](rules.ts) imports the JavaScript file unchanged, so both builds run one source.

Live: [no policy](https://omshankar.app/demos/wasm-csp/), [strict](https://omshankar.app/demos/wasm-csp/strict/) (WebAssembly blocked), [strict with `'wasm-unsafe-eval'`](https://omshankar.app/demos/wasm-csp/strict-wasm/).

## Measured

Apple M4 Pro, scriptc 0.4.8, zig 0.17.1. Headless Chrome 158 numbers are in [`out/wasm-csp-results.json`](out/wasm-csp-results.json), Node 26 numbers in [`out/node-check.txt`](out/node-check.txt).

| | JavaScript | WebAssembly |
|---|---|---|
| Size (raw / brotli) | 5.7 KB / 2.1 KB | 705 KB / 218 KB |
| One pass over 40 sentences, Chrome | 0.021 ms | 0.21 ms |
| One pass over 40 sentences, Node | 0.048 ms | 0.176 ms |
| Outputs that differ, of 45 inputs | | 0 |
| Strict policy without `'wasm-unsafe-eval'` | runs | `CompileError`, blocked |

## Run it

Needs Node 24 or later and [zig](https://ziglang.org).

```sh
npm install
npm run build   # out/airlock-rules.wasm, then the three pages in site/
npm run check   # JavaScript and WebAssembly outputs and timing in Node
npm run bench   # the three pages in Chrome (set CHROME if it isn't in the default macOS location)
npm run serve   # http://127.0.0.1:8791/demos/wasm-csp/
```

`site/_headers` holds the per-page policies in Cloudflare's format.
