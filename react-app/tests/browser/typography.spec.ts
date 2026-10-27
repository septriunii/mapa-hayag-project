import { expect, test, type Page } from '@playwright/test';
import { selectSvgLabel } from './svgInput';

test.use({ reducedMotion: 'reduce' });

async function ready(page: Page, hash: string) {
  await page.goto('/' + hash);
  await expect(page.locator('svg')).toHaveAttribute('data-view', hash);
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('[data-map-labels]')).toHaveAttribute('data-font-ready', 'true');
  // The existing navigation effect opens the drawer on national/city arrival.
  // Wait for that state before capturing/closing it, not just SVG readiness.
  if (hash === '#/' || hash.includes('/municity/')) await expect(page.getByRole('button', { name: 'Close details menu' })).toBeVisible();
}

async function overlaps(page: Page) {
  return page.locator('text[data-label-psgc]').evaluateAll(elements => {
    const boxes = elements.map(element => ({ code: element.getAttribute('data-label-psgc'), box: element.getBoundingClientRect() }));
    const pairs: string[] = [];
    boxes.forEach((a, index) => boxes.slice(index + 1).forEach(b => {
      if (Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left) > 0.5
        && Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top) > 0.5) pairs.push(`${a.code}/${b.code}`);
    }));
    return pairs;
  });
}

test('geographic typography preserves every source name and avoids label collisions across levels and sizes', async ({ page }, info) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  const views = [
    ['national', '#/', 18], ['region', '#/region/900000000', 4],
    ['province', '#/region/900000000/province/907200000', 27],
    ['ncr', '#/region/1300000000', 17],
    ['city', '#/region/900000000/province/907200000/municity/907201000', 1],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const [name, hash, count] of views) {
      await ready(page, hash);
      const labels = page.locator('text[data-label-psgc]');
      await expect(labels).toHaveCount(count);
      const problems = await labels.evaluateAll(elements => elements.flatMap(element => {
        const source = document.querySelector(`path[data-psgc="${element.getAttribute('data-label-psgc')}"]`)?.getAttribute('aria-label') ?? '';
        const expected = document.querySelector('svg')?.getAttribute('data-view') === '#/' ? source.match(/\(([^)]+)\)/)?.[1] ?? source : source;
        const visible = [...element.querySelectorAll('tspan')].map(line => line.textContent).join(' ');
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return visible !== expected || element.getAttribute('data-label-name') !== expected
          || box.width <= 0 || !style.fontFamily.includes('Segoe UI') || style.fontWeight !== '400'
          || box.x < -1 || box.right > innerWidth + 1 ? [expected] : [];
      }));
      expect(problems).toEqual([]);
      expect(await overlaps(page)).toEqual([]);
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 40, 43)');
      await expect(page.locator('[data-administrative-borders]')).toHaveCSS('stroke', 'rgb(127, 141, 137)');
      if (await page.getByRole('button', { name: 'Close details menu' }).isVisible()) await page.getByRole('button', { name: 'Close details menu' }).click();
      await expect(page.locator('#detail')).toHaveCSS('visibility', 'hidden');
      await page.screenshot({ path: info.outputPath(`labels-${name}-${width}.png`) });
    }
  }
  expect(errors).toEqual([]);
  expect(requests.some(url => url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'))).toBe(false);
  expect(requests.some(url => url.includes('roboto-latin-400'))).toBe(false);
});

test('label screen size stays steady through zoom and wrapped municipality names remain clickable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, '#/region/900000000/province/907200000');
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await expect(page.locator('#detail')).toHaveCSS('visibility', 'hidden');
  const label = page.locator('text[data-label-psgc="907201000"]');
  const before = (await label.boundingBox())!.height;
  await page.mouse.move(1100, 450); await page.mouse.wheel(0, -1400);
  await expect(page.locator('svg > g')).not.toHaveAttribute('transform', 'translate(0,0) scale(1)');
  await expect.poll(async () => (await label.boundingBox())!.height).toBeCloseTo(before, 1);
  await expect(label).toHaveCSS('font-weight', '400');
  await expect(label).toHaveCSS('stroke-width', '1.1px');
  // Reset through parent navigation, then exercise native input on a tspan.
  await page.locator('#back-btn').click();
  await expect(page.locator('svg')).toHaveAttribute('data-view', '#/region/900000000');
  await page.locator('path[data-psgc="907200000"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('svg')).toHaveAttribute('data-view', '#/region/900000000/province/907200000');
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
  await selectSvgLabel(page, 'text[data-label-psgc="907201000"]');
  await expect(page.locator('svg')).toHaveAttribute('data-view', '#/region/900000000/province/907200000/municity/907201000');
  await expect(page.locator('#detail-lgu-name')).toHaveText('City of Dapitan');
});

test('nonclickable national labels let pointer input reach their geographic polygons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, '#/');
  await page.getByRole('button', { name: 'Close details menu' }).click();
  const label = page.locator('text[data-label-psgc="300000000"]');
  await expect(label).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('#detail')).toHaveCSS('visibility', 'hidden');
  const point = await label.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('svg')).toHaveAttribute('data-view', '#/region/300000000');
});
