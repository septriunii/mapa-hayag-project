import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

// Source cartographic paints; complementary UI/interaction colors are extensions.
const palette = {
  ocean: 'rgb(36, 40, 43)', sidebar: 'rgb(32, 38, 40)',
  land: 'rgb(77, 96, 89)', border: 'rgb(127, 141, 137)',
  label: 'rgb(184, 192, 186)', primary: 'rgb(238, 241, 232)',
  secondary: 'rgb(180, 190, 182)', divider: 'rgb(60, 71, 66)',
  hover: 'rgb(85, 104, 95)', selected: 'rgb(92, 112, 100)',
  interaction: 'rgb(186, 200, 189)',
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

test('cartographic theme uses the reference palette with readable geographic states', async ({ page }, info) => {
  await page.goto('/');
  const region = page.locator('path[data-psgc="900000000"]');
  await expect(page.locator('path[data-psgc]')).toHaveCount(18);
  await expect(region).toHaveCSS('fill', palette.land);
  await expect(region).toHaveCSS('stroke', palette.border);
  await expect(region).toHaveCSS('stroke-width', '0.25px');
  await expect(page.locator('[data-administrative-borders]')).toHaveCSS('stroke', palette.border);
  await expect(page.locator('body')).toHaveCSS('background-color', palette.ocean);
  await expect(page.locator('main')).toHaveCSS('background-color', palette.ocean);
  await expect(page.locator('#detail')).toHaveCSS('background-color', palette.sidebar);
  await expect(page.locator('#detail')).toHaveCSS('border-right-color', palette.divider);
  await expect(page.locator('#detail-header')).toHaveCSS('border-bottom-color', palette.divider);
  await expect(page.locator('#detail-lgu-name')).toHaveCSS('color', palette.primary);
  await expect(page.locator('#map-description')).toHaveCSS('color', palette.primary);
  for (const id of ['detail-eyebrow', 'detail-close', 'detail-region', 'status']) {
    await expect(page.locator('#' + id)).toHaveCSS('color', palette.secondary);
  }
  await expect(page.locator('text[data-label-psgc="900000000"]')).toHaveCSS('fill', palette.label);
  for (const fill of [palette.land, palette.hover, palette.selected]) {
    expect(contrast(palette.interaction, fill)).toBeGreaterThanOrEqual(3);
  }
  expect(contrast(palette.secondary, palette.sidebar)).toBeGreaterThanOrEqual(4.5);
  // Subdued geographic text has a thin charcoal halo for local contrast.
  expect(contrast(palette.label, palette.ocean)).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: info.outputPath('cartographic-national.png') });
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
  await expect(region).toHaveCSS('stroke', palette.interaction);
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
  await page.screenshot({ path: info.outputPath('cartographic-selected.png') });
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
  await expect(region).toHaveCSS('stroke', palette.interaction);
  await region.focus(); await page.keyboard.press('Enter');
  await expect(region).toHaveAttribute('aria-pressed', 'true');
  await expect(region).toHaveCSS('fill', 'rgb(8, 48, 107)');
});

test('administrative linework stays thin through wheel zoom, pan and every drilldown scale', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  const views = [
    ['#/', '0.65px'], ['#/region/900000000', '0.55px'],
    ['#/region/900000000/province/907200000', '0.45px'],
    ['#/region/900000000/province/907200000/municity/907201000', '0.45px'],
  ];
  for (const [hash, width] of views) {
    await page.goto('/' + hash);
    const svg = page.locator('svg');
    await expect(svg).toHaveAttribute('data-view', hash);
    await expect(svg).toHaveAttribute('aria-busy', 'false');
    // Hash navigation retains the existing drawer state; city arrival opens it.
    if (hash.includes('/municity/')) await expect(page.getByRole('button', { name: 'Close details menu' })).toBeVisible();
    if (await page.getByRole('button', { name: 'Close details menu' }).isVisible()) {
      await page.getByRole('button', { name: 'Close details menu' }).click();
    }
    await expect(page.locator('#detail')).toHaveCSS('visibility', 'hidden');
    const mesh = page.locator('[data-administrative-borders]');
    await expect(mesh).toHaveCSS('stroke', palette.border);
    await expect(mesh).toHaveCSS('stroke-width', width);
    await expect(mesh).toHaveCSS('vector-effect', 'non-scaling-stroke');
    if (hash.includes('/municity/')) await expect(mesh).toHaveAttribute('d', '');
    else expect((await mesh.getAttribute('d'))!.length).toBeGreaterThan(0);
    const feature = page.locator('path[data-psgc]').first();
    const geometry = await feature.getAttribute('d');
    const boundaryGeometry = await mesh.getAttribute('d');
    const networkBefore = requests.length;
    await page.mouse.move(1200, 450);
    await page.mouse.wheel(0, -1400);
    await expect(page.locator('svg > g')).not.toHaveAttribute('transform', 'translate(0,0) scale(1)');
    await expect(mesh).toHaveCSS('stroke-width', width);
    await expect(feature).toHaveCSS('vector-effect', 'non-scaling-stroke');
    await expect(feature).toHaveAttribute('d', geometry!);
    await expect(mesh).toHaveAttribute('d', boundaryGeometry!);
    await page.mouse.move(1200, 450); await page.mouse.down();
    await page.mouse.move(1250, 490, { steps: 5 }); await page.mouse.up();
    await expect(mesh).toHaveAttribute('d', boundaryGeometry!);
    expect(requests.length).toBe(networkBefore);
    await expect(page.locator('body')).toHaveCSS('background-color', palette.ocean);
  }
});
