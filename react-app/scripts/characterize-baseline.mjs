import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root)) { res.writeHead(403).end(); return; }
    const data = await readFile(filename);
    res.setHeader('Content-Type', filename.endsWith('.json') ? 'application/json' : 'text/html');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const d3 = await readFile(new URL('../node_modules/d3/dist/d3.min.js', import.meta.url), 'utf8');
let browser;
const summary = [];
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  for (const entry of ['index.html', 'index-no-nir.html', 'legacy/index.html', 'legacy/index-no-nir.html']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://unpkg.com/d3@7/dist/d3.min.js', route => route.fulfill({ contentType: 'text/javascript', body: d3 }));
    await page.goto(`http://127.0.0.1:${server.address().port}/${entry}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('path.region');
    await page.waitForTimeout(750);
    const visual = await page.evaluate(() => ({
      title: document.title,
      background: getComputedStyle(document.body).backgroundColor,
      panelLeft: document.getElementById('detail').getBoundingClientRect().left,
      panelWidth: document.getElementById('detail').getBoundingClientRect().width,
      nationalFeatures: document.querySelectorAll('path.region').length,
      elapsedAtSnapshotMs: performance.now(),
      transferredBodyBytes: performance.getEntriesByType('resource').reduce((n, r) => n + r.decodedBodySize, 0),
    }));
    const expected = entry.includes('no-nir') ? 17 : 18;
    if (visual.nationalFeatures !== expected || visual.title !== 'MAPAhayag project' || visual.background !== 'rgb(26, 26, 46)' || Math.abs(visual.panelLeft) > 1) throw new Error(`Baseline contract failed: ${JSON.stringify(visual)}`);
    await page.getByRole('button', { name: 'Close details menu' }).click();
    await page.getByRole('button', { name: 'Open details menu' }).click();
    await page.evaluate(() => { const f = nationalFeatures.find(f => f.properties.adm1_psgc === 1300000000); drillRegion(f, true); });
    await page.waitForFunction(() => currentView === 'region');
    const ncrCount = await page.locator('path.mun-fg').count();
    if (ncrCount !== 17) throw new Error(`NCR count ${ncrCount}`);
    await page.evaluate(() => drawNational());
    await page.evaluate(() => { const f = nationalFeatures.find(f => f.properties.adm1_psgc === 600000000); drillRegion(f, true); });
    await page.waitForFunction(() => currentView === 'region');
    const r6Count = await page.locator('path.mun-fg').count();
    if (r6Count !== (expected === 18 ? 5 : 6)) throw new Error(`Region VI count ${r6Count}`);
    const restored = await page.evaluate(async () => {
      await restoreFromHash('/region/300000000/province/305400000/municity/330100000');
      return new Promise(resolve => setTimeout(() => resolve(currentView), 800));
    });
    if (restored !== 'province') throw new Error(`Expected characterized route defect, got ${restored}`);
    summary.push({ entry, ...visual, ncrCount, r6Count, municipalityRouteRestoredAs: restored, errors });
    if (errors.length) throw new Error(errors.join('; '));
    await page.close();
  }
  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
