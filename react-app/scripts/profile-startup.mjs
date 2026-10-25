import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SourceMap } from 'node:module';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Build an isolated source-mapped production bundle first; never publish maps.
// node node_modules/vite/bin/vite.js build --sourcemap --outDir performance-results/profile
const root = fileURLToPath(new URL('../performance-results/profile/', import.meta.url));
const output = path.resolve(root, '..');
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root)) throw new Error('Invalid path');
    res.setHeader('Content-Type', relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.json') ? 'application/json' : relative.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(await readFile(filename));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await session.send('Profiler.enable');
  await session.send('Profiler.setSamplingInterval', { interval: 1000 });
  await session.send('Profiler.start');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => document.querySelector('svg')?.getAttribute('aria-busy') === 'false' && document.querySelectorAll('path[data-psgc]').length === 18);
  const { profile } = await session.send('Profiler.stop');
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const maps = new Map(), totals = new Map();
  for (let index = 0; index < profile.samples.length; index++) {
    const node = nodes.get(profile.samples[index]), frame = node.callFrame;
    let source = frame.functionName || '(native)';
    if (frame.url.includes('/assets/')) {
      if (!maps.has(frame.url)) {
        const filename = path.resolve(root, new URL(frame.url).pathname.slice(1) + '.map');
        maps.set(frame.url, new SourceMap(JSON.parse(await readFile(filename, 'utf8'))));
      }
      const entry = maps.get(frame.url).findEntry(frame.lineNumber, frame.columnNumber);
      source = entry.originalSource ?? frame.url;
    }
    totals.set(source, (totals.get(source) ?? 0) + profile.timeDeltas[index] / 1000);
  }
  const hotSources = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([source, sampledMs]) => ({ source, sampledMs }));
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'startup.cpuprofile'), JSON.stringify(profile));
  await writeFile(path.join(output, 'startup-profile-summary.json'), JSON.stringify({ cpuSlowdown: 4, hotSources }, null, 2) + '\n');
  console.log(JSON.stringify(hotSources, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
