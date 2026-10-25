import { expect, type Page } from '@playwright/test';

/** WebKit's locator-generated click point can miss SVG text. Native input at
 * its rendered client coordinates exercises the label the user actually sees. */
export async function selectSvgLabel(page: Page, selector: string, touch = false) {
  const label = page.locator(selector);
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS('opacity', '1');
  const point = await label.evaluate(element => {
    const box = element.getBoundingClientRect();
    // Dense municipality labels can overlap on a phone. Use a visible portion
    // of the requested text, rather than the neighboring label over its center.
    for (const fy of [0.5, 0.25, 0.75]) for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
      const x = box.x + box.width * fx, y = box.y + box.height * fy;
      if (document.elementFromPoint(x, y) === element) return { x, y };
    }
    throw new Error('SVG label is fully obscured');
  });
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
