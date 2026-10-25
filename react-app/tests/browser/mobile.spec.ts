import { expect, test, type Page } from '@playwright/test';
import { selectSvgLabel } from './svgInput';

async function ready(page: Page, hash: string) {
  await expect(page.locator('svg')).toHaveAttribute('data-view', hash);
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
}
async function settledMap(page: Page) {
  // DOM readiness precedes label reveal and the drawer's closing transition.
  // Capture the steady interface rather than an intermediate animation frame.
  await expect(page.locator('#detail')).toHaveCSS('visibility', 'hidden');
  await page.waitForFunction(() => [...document.querySelectorAll('svg path, svg text')]
    .every(element => getComputedStyle(element).opacity === '1'));
}
async function tapPolygon(page: Page, code: string) {
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
  // geoPath centroid can land outside concave/island polygons. Choose an actual
  // hit-test point inside the path, then send a real touchscreen tap there.
  const point = await page.locator(`path[data-psgc="${code}"]`).evaluate(element => {
    const box = element.getBoundingClientRect();
    for (let y = box.y + 2; y < box.bottom; y += Math.max(2, box.height / 20)) {
      for (let x = box.x + 2; x < box.right; x += Math.max(2, box.width / 20)) {
        if (document.elementFromPoint(x, y) === element) return { x, y };
      }
    }
    throw new Error('No visible hit point for ' + element.getAttribute('data-psgc'));
  });
  await page.touchscreen.tap(point.x, point.y);
}

test('touch drilldown, city reload and parent navigation work on phones/tablets', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await ready(page, '#/');
  await expect(page.getByRole('button', { name: 'Open details menu' })).toBeVisible();
  await tapPolygon(page, '900000000');
  await ready(page, '#/region/900000000');
  await tapPolygon(page, '907200000');
  const province = '#/region/900000000/province/907200000';
  await ready(page, province);
  await selectSvgLabel(page, 'text[data-label-psgc="907201000"]', true);
  await ready(page, province + '/municity/907201000');
  await expect(page.locator('#detail-lgu-name')).toHaveText('City of Dapitan');
  await page.getByRole('button', { name: 'Close details menu' }).tap();
  await page.reload();
  await ready(page, province + '/municity/907201000');
  await page.getByRole('button', { name: 'Close details menu' }).tap();
  await page.locator('#back-btn').tap();
  await ready(page, province);
  await settledMap(page);
  await page.screenshot({ path: info.outputPath('touch-province.png') });
  expect(errors).toEqual([]);
});

test('narrow layout keeps hamburger and long parent Back button independently tappable', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/#/region/900000000/province/907200000');
  await ready(page, '#/region/900000000/province/907200000');
  const menu = page.getByRole('button', { name: 'Open details menu' });
  const back = page.locator('#back-btn');
  const menuBox = (await menu.boundingBox())!, backBox = (await back.boundingBox())!;
  expect(backBox.x).toBeGreaterThanOrEqual(menuBox.x + menuBox.width + 4);
  await menu.tap();
  await expect(page.getByRole('complementary')).toHaveCSS('width', '320px');
  await page.getByRole('button', { name: 'Close details menu' }).tap();
  await back.tap();
  await ready(page, '#/region/900000000');
  await settledMap(page);
  await page.screenshot({ path: info.outputPath('narrow-controls.png') });
});

test('orientation changes, touch panning and NCR city navigation keep the map usable', async ({ page }, info) => {
  await page.goto('/#/region/1300000000');
  await ready(page, '#/region/1300000000');
  await expect(page.locator('path[data-psgc]')).toHaveCount(17);
  for (const [width, height] of [[844, 390], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('svg')).toHaveAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  // Synthesized touch events exercise D3's touch listeners, rather than its
  // mouse-only drag path. Touch taps above use Playwright's native touchscreen.
  const svg = page.locator('svg');
  await svg.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 500, clientY: 200, pageX: 500, pageY: 200 }], changedTouches: [{ identifier: 1, clientX: 500, clientY: 200, pageX: 500, pageY: 200 }] });
  await svg.dispatchEvent('touchmove', { touches: [{ identifier: 1, clientX: 540, clientY: 220, pageX: 540, pageY: 220 }], changedTouches: [{ identifier: 1, clientX: 540, clientY: 220, pageX: 540, pageY: 220 }] });
  await svg.dispatchEvent('touchend', { touches: [], changedTouches: [{ identifier: 1, clientX: 540, clientY: 220, pageX: 540, pageY: 220 }] });
  await expect(page.locator('svg > g')).not.toHaveAttribute('transform', 'translate(0,0) scale(1)');
  await tapPolygon(page, '1380600000');
  await ready(page, '#/region/1300000000/municity/1380600000');
  await page.getByRole('button', { name: 'Close details menu' }).tap();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(svg).toHaveAttribute('viewBox', '0 0 390 844');
  await expect(page.locator('svg > g')).toHaveAttribute('transform', 'translate(0,0) scale(1)');
  await settledMap(page);
  await page.screenshot({ path: info.outputPath('ncr-city-portrait.png') });
});
