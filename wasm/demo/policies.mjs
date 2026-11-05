// The three copies of the demo page differ only in the Content Security Policy
// header. The local server and the site's _headers file both use this list.
const base = "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

export const POLICIES = [
  { dir: '', id: 'none', label: 'No Content Security Policy', csp: null },
  { dir: 'strict', id: 'strict', label: "Strict policy, without 'wasm-unsafe-eval'", csp: `${base}; script-src 'self'` },
  { dir: 'strict-wasm', id: 'strict-wasm', label: "Strict policy, with 'wasm-unsafe-eval'", csp: `${base}; script-src 'self' 'wasm-unsafe-eval'` },
];

export const MOUNT = '/demos/wasm-csp/';
