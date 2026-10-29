import { expect, test, type Page } from '@playwright/test';

const ix = '[data-profile-key="region:0900000000"]';
const national = '[data-profile-key="national"]';
async function ready(page: Page, hash: string) {
  await expect(page.locator('svg')).toHaveAttribute('data-view', hash);
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
  await page.waitForFunction(() => [...document.querySelectorAll('svg path, svg text')].every(node => getComputedStyle(node).opacity === '1'));
}
async function select(page: Page, code: string) {
  await page.locator(`path[data-psgc="${code}"]`).focus();
  await page.keyboard.press('Enter');
}

test('pilot profiles follow selection, history, reload and exact geographic levels', async ({ page }, info) => {
  await page.goto('/'); await ready(page, '#/');
  await expect(page.locator(national)).toContainText('112,729,484');
  await expect(page.locator(national).locator('[data-metric="density"]')).toContainText('376');
  await expect(page.locator(national)).toContainText('1,708');
  await page.screenshot({ path: info.outputPath('profile-national.png') });
  await select(page, '900000000'); await ready(page, '#/region/900000000');
  await expect(page.locator(ix)).toContainText('5,089,934');
  await expect(page.locator(ix)).toContainText('0900000000');
  await expect(page.locator(ix).getByText('Data unavailable', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('complementary', { name: 'Administrative boundary notice' })).toContainText('does not include Sulu');
  await expect(page.locator(national)).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('profile-region-ix.png') });
  await page.goBack(); await ready(page, '#/');
  await expect(page.locator(national)).toBeVisible();
  await page.goForward(); await ready(page, '#/region/900000000');
  await expect(page.locator(ix)).toBeVisible();
  await page.reload(); await ready(page, '#/region/900000000');
  await expect(page.locator(ix)).toBeVisible();
  await select(page, '907200000'); await ready(page, '#/region/900000000/province/907200000');
  await expect(page.locator('[data-profile-key]')).toHaveCount(0);
  await expect(page.locator('#detail-body')).toHaveText('No data for this area.');
  await page.locator('#back-btn').click(); await ready(page, '#/region/900000000');
  await page.locator('#back-btn').click(); await ready(page, '#/');
  await select(page, '1300000000'); await ready(page, '#/region/1300000000');
  await expect(page.locator('[data-profile-key]')).toHaveCount(0);
  await expect(page.locator('#detail-body')).toHaveText('No data for this area.');
});

test('source links are direct official URLs and profile scrolling preserves header and map', async ({ page }, info) => {
  await page.goto('/#/region/0900000000'); await ready(page, '#/region/900000000');
  const header = await page.locator('#detail-header').boundingBox();
  const transform = await page.locator('svg > g').getAttribute('transform');
  const links = await page.locator(ix).getByRole('link').evaluateAll(nodes => nodes.map(node => ({ href: (node as HTMLAnchorElement).href, rel: (node as HTMLAnchorElement).rel, target: (node as HTMLAnchorElement).target })));
  expect(links.length).toBeGreaterThan(10);
  for (const link of links) {
    const url = new URL(link.href);
    expect(url.protocol).toBe('https:');
    expect(url.hostname === 'kwfwikaatkultura.ph' || url.hostname.endsWith('.gov.ph')).toBe(true);
    expect(link.rel).toContain('noopener'); expect(link.target).toBe('_blank');
  }
  await page.locator('#detail-body').hover(); await page.mouse.wheel(0, 2000);
  await expect.poll(() => page.locator('#detail-body').evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#detail-header').boundingBox()).toEqual(header);
  await expect(page.getByRole('button', { name: 'Close details menu' })).toBeVisible();
  await expect(page.locator('svg > g')).toHaveAttribute('transform', transform!);
  await page.locator('#detail-body').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await page.screenshot({ path: info.outputPath('profile-region-sources.png') });
  await page.locator('#back-btn').click(); await ready(page, '#/');
  await expect.poll(() => page.locator('#detail-body').evaluate(node => node.scrollTop)).toBe(0);
});

test('profile content clears during interrupted and failed geographic loads', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/provdists-region-900000000.0.001.json', async route => { await gate; await route.fulfill({ status: 503, body: '' }); });
  await page.goto('/'); await ready(page, '#/');
  await select(page, '900000000');
  await expect(page.locator('#detail-body')).toHaveText('Loading location details…');
  await expect(page.locator('[data-profile-key]')).toHaveCount(0);
  await page.goBack(); await ready(page, '#/');
  await expect(page.locator(national)).toBeVisible();
  const response = page.waitForResponse(url => url.url().includes('provdists-region-900000000'));
  release(); await response;
  await expect(page.locator(national)).toBeVisible();
  await page.unroute('**/provdists-region-900000000.0.001.json');
  await page.route('**/provdists-region-900000000.0.001.json', route => route.fulfill({ status: 503, body: '' }));
  await select(page, '900000000');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await expect(page.locator('[data-profile-key]')).toHaveCount(0);
  await expect(page.locator('#detail-lgu-name')).toHaveText('Location unavailable');
  await page.unroute('**/provdists-region-900000000.0.001.json');
  await page.getByRole('button', { name: 'Retry' }).click();
  await ready(page, '#/region/900000000'); await expect(page.locator(ix)).toBeVisible();
});

test('region-only configuration displays the profile and retains configured data safely', async ({ page }) => {
  await page.route('**/data.json', route => route.fulfill({ json: { maxDepth: 'region', detailFields: [{ key: 'note', label: 'Custom record' }], data: { region: [{ psgc: 900000000, note: '<img src=x onerror=alert(1)>' }] } } }));
  await page.goto('/'); await ready(page, '#/'); await select(page, '900000000');
  await expect(page.locator(ix)).toBeVisible();
  await expect(page.locator('#detail-body')).toContainText('<img src=x');
  await expect(page.locator('#detail img')).toHaveCount(0);
  await select(page, '1300000000');
  await expect(page.locator('[data-profile-key]')).toHaveCount(0);
  await expect(page.locator('#detail-body')).toHaveText('No data for this area.');
});
