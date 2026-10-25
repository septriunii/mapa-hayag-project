import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from 'vite';

// Own the preview server directly. This avoids a lingering shell/server process
// after Playwright finishes on Windows and guarantees server cleanup on failure.
const dev = process.env.MAPAHAYAG_TEST_DEV === '1';
const server = dev
  ? await createServer({ server: { host: '127.0.0.1', port: 4173, strictPort: true } })
  : await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
if (dev) await server.listen();
try {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)), 'test', ...process.argv.slice(2)], { stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  process.exitCode = code ?? 1;
} finally {
  if (dev) await server.close();
  else await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
