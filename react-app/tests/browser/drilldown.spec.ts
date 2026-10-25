import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { selectSvgLabel } from './svgInput';

async function ready(page: Page, hash: string) {
  await expect(page.locator('svg')).toHaveAttribute('data-view', hash);
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
}
async function activate(page: Page, code: string) {
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
  await page.locator(`path[data-psgc="${code}"]`).focus();
  await page.keyboard.press('Enter');
}

test('ordinary drilldown, parent controls, browser history, deep links and cache revisits', async ({ page }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await ready(page, '#/');
  await activate(page, '900000000');
  await ready(page, '#/region/900000000');
  await expect(page.locator('path[data-psgc]')).toHaveCount(4);
  await expect(page.locator('#detail-lgu-name')).toHaveText('Region IX (Zamboanga Peninsula)');
  await page.screenshot({ path: 'test-results/drilldown-region.png' });
  await activate(page, '907200000');
  const provinceHash = '#/region/900000000/province/907200000';
  await ready(page, provinceHash);
  await expect(page.locator('#back-btn')).toContainText('Region IX');
  await page.getByRole('button', { name: 'Close details menu' }).click();
  // Real mouse hit on a label preserves access to tiny municipality polygons.
  await selectSvgLabel(page, 'text[data-label-psgc="907201000"]');
  const cityHash = provinceHash + '/municity/907201000';
  await ready(page, cityHash);
  await expect(page.locator('path[data-psgc]')).toHaveCount(1);
  await expect(page.locator('#detail-lgu-name')).toHaveText('City of Dapitan');
  await expect(page.locator('#detail-region')).toHaveText('Zamboanga del Norte');
  await expect(page.locator('#back-btn')).toHaveText('← Zamboanga del Norte');
  await page.screenshot({ path: 'test-results/drilldown-city.png' });
  await page.goBack();
  await ready(page, provinceHash);
  await page.goForward();
  await ready(page, cityHash);
  expect(requests.filter(url => url.includes('municities-provdist-907200000'))).toHaveLength(1);
  expect(requests.filter(url => url.includes('huc-boundaries'))).toHaveLength(1);
  await page.reload();
  await ready(page, cityHash);
  await expect(page.locator('path[data-psgc]')).toHaveCount(1);
  await page.locator('#back-btn').click();
  await ready(page, provinceHash);
  await page.locator('#back-btn').click();
  await ready(page, '#/region/900000000');
  await page.locator('#back-btn').click();
  await ready(page, '#/');
  expect(errors).toEqual([]);
});

for (const [alignment, region, provinceCount] of [['nir', '1800000000', 3], ['legacy', '600000000', 6]] as const) {
  test(`${alignment} keeps supplementary Bacolod city and province parents in the displayed hierarchy`, async ({ page }) => {
    await page.goto(`/?alignment=${alignment}`);
    await activate(page, region);
    await ready(page, `#/region/${region}`);
    await expect(page.locator('path[data-psgc]')).toHaveCount(provinceCount);
    await activate(page, '604500000');
    const provincial = `#/region/${region}/province/604500000`;
    await ready(page, provincial);
    await activate(page, '630200000');
    await ready(page, provincial + '/municity/630200000');
    await expect(page.locator('#detail-lgu-name')).toHaveText('City of Bacolod');
    await page.reload();
    await ready(page, provincial + '/municity/630200000');
    await page.locator('#back-btn').click();
    await ready(page, provincial);
    await page.locator('#back-btn').click();
    await ready(page, `#/region/${region}`);
  });
}

test('NCR bypasses districts, retains seam background and restores old district URLs', async ({ page }) => {
  await page.goto('/');
  await activate(page, '1300000000');
  await ready(page, '#/region/1300000000');
  await expect(page.locator('path[data-psgc]')).toHaveCount(17);
  await expect(page.locator('path.region-bg')).toHaveCount(1);
  await activate(page, '1380600000');
  await ready(page, '#/region/1300000000/municity/1380600000');
  await expect(page.locator('#detail-lgu-name')).toHaveText('City of Manila');
  await page.locator('#back-btn').click();
  await ready(page, '#/region/1300000000');
  await page.goto('/#/region/1300000000/province/1303900000/municity/1380600000');
  await ready(page, '#/region/1300000000/municity/1380600000');
  await expect(page).toHaveURL(/#\/region\/1300000000\/municity\/1380600000$/);
});

test('failed regional loading retries and navigation survives malformed or invalid geography', async ({ page }) => {
  let calls = 0;
  await page.route('**/provdists-region-900000000.0.001.json', async route => {
    calls++;
    if (calls === 1) await route.fulfill({ status: 503, body: '' });
    else await route.continue();
  });
  await page.goto('/');
  await activate(page, '900000000');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await page.getByRole('button', { name: 'Retry' }).click();
  await ready(page, '#/region/900000000');
  expect(calls).toBe(2);
  await page.goto('/#/region/1900000000/province/1909900000');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('#back-btn').click();
  await ready(page, '#/region/1900000000');
  await expect(page.getByRole('status')).toContainText('source data warning');
  await page.goto('/#/region/1');
  await expect(page.getByRole('alert')).toContainText('Unknown region');
  await page.locator('#back-btn').click();
  await ready(page, '#/');
});

test('ignores a stale regional response after browser Back', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const seen = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/provdists-region-900000000.0.001.json', async route => {
    requested(); await gate; await route.continue();
  });
  await page.goto('/');
  await activate(page, '900000000');
  await seen;
  await page.goBack();
  await ready(page, '#/');
  const response = page.waitForResponse(url => url.url().includes('provdists-region-900000000'));
  release(); await response;
  // A second route exercises the settled cache and proves the old request
  // cannot restore the wrong map after navigation changed.
  await activate(page, '1300000000');
  await ready(page, '#/region/1300000000');
  await expect(page.locator('path[data-psgc]')).toHaveCount(17);
});

test('parent navigation interrupts an in-progress geographic animation cleanly', async ({ page }) => {
  await page.goto('/');
  await activate(page, '900000000');
  // The new region has loaded but the previous geometry is still animating.
  await expect(page.locator('#back-btn')).toHaveText('← Philippines');
  await page.locator('#back-btn').click();
  await ready(page, '#/');
  await activate(page, '1300000000');
  await ready(page, '#/region/1300000000');
  await expect(page.locator('path[data-psgc]')).toHaveCount(17);
  await expect(page.locator('svg > g')).toHaveAttribute('transform', 'translate(0,0) scale(1)');
});

for (const maxDepth of ['region', 'province'] as const) {
  test(`maxDepth=${maxDepth} opens details without loading beyond the configured level`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.route('**/data.json', route => route.fulfill({ json: { maxDepth } }));
    await page.goto('/');
    await activate(page, '900000000');
    if (maxDepth === 'province') {
      await ready(page, '#/region/900000000');
      await activate(page, '907200000');
      await expect(page.locator('#detail-lgu-name')).toHaveText('Zamboanga del Norte');
    } else await expect(page.locator('#detail-lgu-name')).toContainText('Region IX');
    expect(requests.some(url => url.includes('/provdists/'))).toBe(false);
    await ready(page, maxDepth === 'region' ? '#/' : '#/region/900000000');
  });
}

test('city zoom, responsive deep links and safe metric details work together', async ({ page }) => {
  await page.route('**/data.json', route => route.fulfill({ json: {
    colorField: 'value', colorDomain: [0, 100], colorScheme: 'interpolateBlues',
    detailFields: [{ key: 'note', label: 'Note' }],
    data: { municity: [{ psgc: 630200000, value: 100, note: '<img src=x onerror=alert(1)>' }] },
  } }));
  await page.setViewportSize({ width: 390, height: 844 });
  const hash = '#/region/1800000000/province/604500000/municity/630200000';
  await page.goto('/' + hash);
  await ready(page, hash);
  await expect(page.locator('path[data-psgc]')).toHaveAttribute('fill', 'rgb(8, 48, 107)');
  await expect(page.locator('#detail-body')).toContainText('<img src=x');
  await expect(page.locator('#detail img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await page.mouse.move(250, 400);
  await page.mouse.wheel(0, -200);
  await expect(page.locator('svg > g')).not.toHaveAttribute('transform', 'translate(0,0) scale(1)');
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator('svg')).toHaveAttribute('viewBox', '0 0 320 568');
  await page.locator('#back-btn').click();
  await ready(page, '#/region/1800000000/province/604500000');
  await expect(page.locator('svg > g')).toHaveAttribute('transform', 'translate(0,0) scale(1)');
});

test('regional, provincial, NCR and isolated city paths and labels match legacy rendering', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const baseline = await context.newPage();
  await baseline.setViewportSize({ width: 1440, height: 900 });
  await baseline.route('**/baseline.html', route => route.fulfill({ contentType: 'text/html', body: readFileSync('../index.html', 'utf8') }));
  await baseline.route('https://unpkg.com/d3@7/dist/d3.min.js', route => route.fulfill({ contentType: 'text/javascript', body: readFileSync('node_modules/d3/dist/d3.min.js', 'utf8') }));
  const snapshot = () => ({
    paths: Array.from(document.querySelectorAll('svg path[data-psgc], svg path.province, svg path.municity, svg path.huc-city')).map(element => element.getAttribute('d')).sort(),
    labels: Array.from(document.querySelectorAll('svg text')).map(element => ({ name: element.textContent, x: element.getAttribute('x'), y: element.getAttribute('y'), size: element.getAttribute('font-size') })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
  });
  for (const hash of ['#/region/900000000', '#/region/900000000/province/907200000', '#/region/1300000000', '#/region/1800000000/province/604500000']) {
    await page.goto('/' + hash);
    await ready(page, hash);
    await baseline.goto('/baseline.html' + hash);
    // A fresh boot avoids the legacy popstate handler treating externally
    // edited hashes as national when history.state lacks its custom payload.
    await baseline.reload();
    await expect(baseline.locator('path.province, path.municity')).not.toHaveCount(0);
    if (hash.includes('/province/')) await expect(baseline.locator('path.municity')).not.toHaveCount(0);
    expect(await page.evaluate(snapshot)).toEqual(await baseline.evaluate(snapshot));
  }
  // The legacy municipality deep-link bug prevents using a fresh city URL as
  // a reference. Reach Bacolod through its province, then compare its view.
  if (await baseline.locator('#detail-close').isVisible()) await baseline.locator('#detail-close').click();
  await selectSvgLabel(baseline, 'text.huc-label');
  await page.goto('/#/region/1800000000/province/604500000/municity/630200000');
  await ready(page, '#/region/1800000000/province/604500000/municity/630200000');
  await expect(baseline.locator('svg path')).toHaveCount(1);
  expect(await page.evaluate(snapshot)).toEqual(await baseline.evaluate(snapshot));
  await baseline.close();
});
