import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

// Exact paints read from Figma frame 1:15 (vectors 2:3–2:53 for land/borders).
const palette = {
  ocean: 'rgb(12, 27, 48)', sidebar: 'rgb(10, 19, 34)',
  land: 'rgb(40, 92, 88)', border: 'rgb(105, 207, 201)',
  label: 'rgb(242, 247, 255)', primary: 'rgb(240, 246, 255)',
  secondary: 'rgb(154, 170, 193)', divider: 'rgb(39, 49, 67)',
  hover: 'rgb(50, 110, 105)', selected: 'rgb(52, 95, 124)',
};

async function hoverRegion(page: Page, code: string) {
  await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#detail')).toHaveCSS('visibility', 'hidden');
  // Concave island polygons can have their bounding-box center in the ocean.
  // Use a real pointer movement to a visible point inside the GeoJSON path.
  const point = await page.locator(`path[data-psgc="${code}"]`).evaluate(element => {
    const box = element.getBoundingClientRect();
    for (let y = box.y + 2; y < box.bottom; y += Math.max(2, box.height / 20)) {
      for (let x = box.x + 2; x < box.right; x += Math.max(2, box.width / 20)) {
        if (document.elementFromPoint(x, y) === element) return { x, y };
      }
    }
    throw new Error('No visible hit point for ' + element.getAttribute('data-psgc'));
  });
  await page.mouse.move(point.x, point.y);
}

function contrast(first: string, second: string) {
  const luminance = (color: string) => {
    const values = color.match(/\d+/g)!.map(value => Number(value) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('Midnight Ocean uses the exact Figma palette with readable geographic states', async ({ page }, info) => {
  await page.goto('/');
  const region = page.locator('path[data-psgc="900000000"]');
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  await expect(region).toHaveCSS('fill', palette.land);
  await expect(region).toHaveCSS('stroke', palette.border);
  await expect(page.locator('body')).toHaveCSS('background-color', palette.ocean);
  await expect(page.locator('main')).toHaveCSS('background-color', palette.ocean);
  await expect(page.locator('#detail')).toHaveCSS('background-color', palette.sidebar);
  await expect(page.locator('#detail')).toHaveCSS('border-right-color', palette.divider);
  await expect(page.locator('#detail-header')).toHaveCSS('border-bottom-color', palette.divider);
  await expect(page.locator('#detail-lgu-name')).toHaveCSS('color', palette.primary);
  await expect(page.locator('#detail-body p')).toHaveCSS('color', palette.primary);
  for (const id of ['detail-eyebrow', 'detail-close', 'detail-region', 'status']) {
    await expect(page.locator('#' + id)).toHaveCSS('color', palette.secondary);
  }
  await expect(page.locator('text[data-label-psgc="900000000"]')).toHaveCSS('fill', palette.label);
  for (const fill of [palette.land, palette.hover, palette.selected]) {
    expect(contrast(palette.label, fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.border, fill)).toBeGreaterThanOrEqual(3);
  }
  expect(contrast(palette.secondary, palette.sidebar)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(palette.label, palette.land)).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: info.outputPath('midnight-ocean-national.png') });
});

test('hover and keyboard selection highlight real polygons without changing geometry or routing', async ({ page }, info) => {
  await page.route('**/data.json', route => route.fulfill({ json: { maxDepth: 'region' } }));
  await page.goto('/');
  const region = page.locator('path[data-psgc="900000000"]');
  await expect(region).toHaveCSS('fill', palette.land);
  const geometry = await region.getAttribute('d');
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await hoverRegion(page, '900000000');
  await expect(region).toHaveCSS('fill', palette.hover);
  await expect(region).toHaveCSS('stroke', palette.label);
  await page.mouse.move(1400, 20);
  await expect(region).toHaveCSS('fill', palette.land);
  // Tab from the preceding polygon so the browser applies :focus-visible
  // through real keyboard navigation rather than programmatic focus heuristics.
  await page.locator('path[data-psgc="800000000"]').focus();
  await page.keyboard.press('Tab');
  await expect(region).toBeFocused();
  await expect(region).toHaveCSS('fill', palette.hover);
  await page.keyboard.press('Enter');
  await expect(region).toHaveAttribute('aria-pressed', 'true');
  await expect(region).toHaveCSS('fill', palette.selected);
  await expect(page.locator('#detail-lgu-name')).toContainText('Region IX');
  await expect(page.locator('svg')).toHaveAttribute('data-view', '#/');
  await expect(region).toHaveAttribute('d', geometry!);
  await expect(page.locator('#detail')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.screenshot({ path: info.outputPath('midnight-ocean-selected.png') });
  const next = page.locator('path[data-psgc="1800000000"]');
  await next.focus(); await page.keyboard.press('Enter');
  await expect(next).toHaveAttribute('aria-pressed', 'true');
  await expect(region).toHaveAttribute('aria-pressed', 'false');
  await expect(region).toHaveCSS('fill', palette.land);
});

test('choropleth values keep their fills while hover and selection add an outline', async ({ page }) => {
  await page.route('**/data.json', route => route.fulfill({ json: {
    maxDepth: 'region', colorField: 'value', colorDomain: [0, 100], colorScheme: 'interpolateBlues',
    data: { region: [{ psgc: 900000000, value: 100 }] },
  } }));
  await page.goto('/');
  const region = page.locator('path[data-psgc="900000000"]');
  await expect(region).toHaveCSS('fill', 'rgb(8, 48, 107)');
  await page.getByRole('button', { name: 'Close details menu' }).click();
  await hoverRegion(page, '900000000');
  await expect(region).toHaveCSS('fill', 'rgb(8, 48, 107)');
  await expect(region).toHaveCSS('stroke', palette.label);
  await region.focus(); await page.keyboard.press('Enter');
  await expect(region).toHaveAttribute('aria-pressed', 'true');
  await expect(region).toHaveCSS('fill', 'rgb(8, 48, 107)');
});
