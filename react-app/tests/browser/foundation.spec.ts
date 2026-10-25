import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('production preview preserves national paths, dark UI, drawer, and selection', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ph-map-theme', 'light'));
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  await expect(page).toHaveTitle('MAPAhayag project');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(26, 26, 46)');
  await expect(page.locator('#theme-btn')).toHaveCount(0);
  const drawer = page.getByRole('complementary');
  expect((await drawer.boundingBox())?.x).toBeCloseTo(0);
  expect((await drawer.boundingBox())?.width).toBe(360);
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await page.getByRole('button', { name: 'Open details menu' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open details menu' })).toBeVisible();
  expect(requests.filter(url => url.endsWith('data.json'))).toHaveLength(1);
  expect(requests.filter(url => url.includes('country.0.001.json'))).toHaveLength(1);
  expect(requests.some(url => url.includes('/regions/') || url.includes('/provdists/'))).toBe(false);
  await page.locator('path[data-psgc="1800000000"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('svg')).toHaveAttribute('data-view', '#/region/1800000000');
  await expect(page.locator('path[data-psgc]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Open details menu' }).click();
  await expect(drawer).toContainText('Negros Island Region');
  await page.screenshot({ path: 'test-results/foundation-desktop.png' });
});

test('uses the same linear D3 paths as the legacy national projection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  const d3Code = readFileSync(path.resolve('node_modules/d3/dist/d3.min.js'), 'utf8');
  await page.addScriptTag({ content: d3Code });
  const mismatches = await page.evaluate(async () => {
    const d3 = (window as unknown as { d3: typeof import('d3') }).d3;
    const country = await (await fetch('/geo-nir/country.0.001.json')).json();
    const scale = Math.min((1440 - 60) / (126.60 - 116.93), (900 - 60) / (20.84 - 4.64));
    const offX = (1440 - (126.60 - 116.93) * scale) / 2, offY = (900 - (20.84 - 4.64) * scale) / 2;
    const path = d3.geoPath().projection(d3.geoTransform({ point(lon, lat) { this.stream.point(offX + (lon - 116.93) * scale, offY + (20.84 - lat) * scale); } }));
    return country.features.filter((f: import('../../src/geography/types').GeographicFeature) => document.querySelector(`path[data-psgc="${f.properties.adm1_psgc}"]`)?.getAttribute('d') !== path(f)).length;
  });
  expect(mismatches).toBe(0);
});

test('explicit legacy alignment loads 17 regions', async ({ page }) => {
  await page.goto('/?alignment=legacy');
  await expect(page.locator('path[data-psgc]')).toHaveCount(17);
  await expect(page.locator('path[data-psgc="1800000000"]')).toHaveCount(0);
});

test('coarse-pointer layout starts closed and remains a left drawer on resize', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  await page.getByRole('button', { name: 'Open details menu' }).click();
  const drawer = page.getByRole('complementary');
  await expect(drawer).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  expect((await drawer.boundingBox())?.width).toBe(360);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator('svg')).toHaveAttribute('viewBox', '0 0 320 568');
  expect((await drawer.boundingBox())?.width).toBe(320);
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await expect(page.getByRole('button', { name: 'Open details menu' })).toBeFocused();
  await context.close();
});

test('reports a load failure and retries the failed resource', async ({ page }) => {
  let calls = 0;
  await page.route('**/data.json', async route => {
    calls++;
    if (calls === 1) await route.fulfill({ status: 503, body: '' });
    else await route.fulfill({ json: JSON.parse(readFileSync('../data.json', 'utf8')) });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  expect(calls).toBe(2);
});

test('renders configuration HTML literally and rejects invalid alignment', async ({ page }) => {
  await page.route('**/data.json', route => route.fulfill({ json: { description: '<img src=x onerror="window.injected=true">' } }));
  await page.goto('/');
  await expect(page.getByRole('complementary')).toContainText('<img src=x');
  await expect(page.locator('#detail img')).toHaveCount(0);
  await page.goto('/?alignment=unknown');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('matches the baseline welcome drawer geometry and text styling', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  const baseline = await context.newPage();
  await baseline.setViewportSize({ width: 1440, height: 900 });
  await baseline.route('**/baseline.html', route => route.fulfill({ contentType: 'text/html', body: readFileSync('../index.html', 'utf8') }));
  await baseline.route('https://unpkg.com/d3@7/dist/d3.min.js', route => route.fulfill({ contentType: 'text/javascript', body: readFileSync('node_modules/d3/dist/d3.min.js', 'utf8') }));
  await baseline.goto('/baseline.html');
  await expect(baseline.locator('path.region')).toHaveCount(18);
  await expect(baseline.locator('#detail')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const snapshot = () => ['detail', 'detail-header', 'detail-eyebrow', 'detail-lgu-name', 'detail-region', 'detail-close', 'detail-body'].map(id => {
    const element = document.getElementById(id)!;
    const box = element.getBoundingClientRect(), style = getComputedStyle(element);
    return { id, x: box.x, y: box.y, width: box.width, height: box.height, font: style.fontFamily, size: style.fontSize, lineHeight: style.lineHeight, color: style.color, bg: style.backgroundColor };
  });
  expect(await page.evaluate(snapshot)).toEqual(await baseline.evaluate(snapshot));
  await baseline.close();
});
