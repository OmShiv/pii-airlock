// Serves wasm/site/ with the same per-path Content-Security-Policy headers
// as the _headers file, for local testing.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICIES, MOUNT } from './policies.mjs';

const root = fileURLToPath(new URL('../site', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };

export function serve(port = 8791) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const policy = POLICIES.find((p) => p.csp && path.startsWith(`${MOUNT}${p.dir}/`));
      try {
        const body = await readFile(join(root, normalize(path)));
        res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', ...(policy ? { 'Content-Security-Policy': policy.csp } : {}) });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    }).listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await serve();
  console.log(`http://127.0.0.1:8791${MOUNT}`);
}
