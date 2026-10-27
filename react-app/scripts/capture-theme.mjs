import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

// Reproducible, local-only visual evidence; does not alter the application/data.
const label = process.argv[2];
if (!['before', 'after', 'typography-before', 'typography-after', 'segoe'].includes(label)) throw new Error('Usage: node scripts/capture-theme.mjs before|after|typography-before|typography-after|segoe');
const folder = `theme-results/${label}`;
await mkdir(folder, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const views = [
    ['national', '#/'], ['region', '#/region/900000000'],
    ['province', '#/region/900000000/province/907200000'],
    ['city', '#/region/900000000/province/907200000/municity/907201000'],
  ];
  const evidence = [];
  for (const [name, hash] of views) {
    await page.goto(`http://127.0.0.1:4174/${hash}`);
    await page.waitForFunction(hash => document.querySelector('svg')?.getAttribute('data-view') === hash
      && document.querySelector('svg')?.getAttribute('aria-busy') === 'false', hash);
    if (await page.locator('[data-map-labels]').count()) {
      await page.waitForFunction(() => document.querySelector('[data-map-labels]')?.getAttribute('data-font-ready') === 'true');
    }
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#detail')).transform === 'matrix(1, 0, 0, 1, 0, 0)');
    await page.screenshot({ path: `${folder}/desktop-${name}.png` });
    evidence.push({ name, ...await page.evaluate(() => {
      const features = [...document.querySelectorAll('path[data-psgc]')];
      const mesh = document.querySelector('[data-administrative-borders]');
      const style = getComputedStyle(features[0]);
      return { polygons: features.length, ocean: getComputedStyle(document.body).backgroundColor,
        fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, vectorEffect: style.vectorEffect,
        boundaryPathLength: mesh?.getAttribute('d')?.length ?? 0,
        boundaryStroke: mesh ? getComputedStyle(mesh).stroke : undefined };
    }) });
    if (name === 'province') {
      await page.getByRole('button', { name: 'Close details menu' }).click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#detail')).visibility === 'hidden');
      await page.mouse.move(1000, 450);
      await page.mouse.wheel(0, -900);
      await page.waitForFunction(() => document.querySelector('svg > g')?.getAttribute('transform') !== 'translate(0,0) scale(1)');
      await page.waitForTimeout(200); // D3's wheel gesture settles after 150ms.
      await page.screenshot({ path: `${folder}/desktop-province-zoom.png` });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4174/#/region/900000000/province/907200000');
  await page.waitForFunction(() => document.querySelector('svg')?.getAttribute('aria-busy') === 'false');
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#detail')).visibility === 'hidden');
  await page.screenshot({ path: `${folder}/mobile-province.png` });
  await writeFile(`${folder}/rendered-properties.json`, JSON.stringify({ label, evidence, errors }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Saved six ${label} screenshots and rendered properties to ${folder}/`);
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
