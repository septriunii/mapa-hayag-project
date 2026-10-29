import { expect, test } from '@playwright/test';
import pilots from '../../src/data/geographic-profiles.json' with { type: 'json' };
import additions from '../../src/data/regional-profiles.json' with { type: 'json' };

for (const profile of [...pilots, ...additions].filter(item => item.level === 'region')) {
  test(`${profile.name}: correct profile and dated values on deep link and reload`, async ({ page }, info) => {
    const route = `#/region/${Number(profile.psgc)}`;
    await page.goto('/' + route);
    await expect(page.locator('svg')).toHaveAttribute('data-view', route);
    await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
    const article = page.locator(`[data-profile-key="${profile.key}"]`);
    await expect(article).toBeVisible();
    await expect(page.locator('[data-profile-key]')).toHaveCount(1);
    await expect(article.locator('[data-metric="population"]')).toContainText(Number(profile.metrics[0].value).toLocaleString('en-PH'));
    await expect(article.locator('[data-metric="area"] time')).toHaveAttribute('datetime', '2024-07-01');
    await expect(article.locator('[data-metric="provinces"] time')).toHaveAttribute('datetime', '2026-09-30');
    await expect(article.getByRole('heading', { name: 'Geography and Location' })).toHaveCount(1);
    await expect(article.getByRole('heading', { name: 'History and Administration' })).toHaveCount(1);
    await expect(article.getByRole('heading', { name: 'Economy and Culture' })).toHaveCount(1);
    await page.reload();
    await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
    await expect(article).toBeVisible();
    if (['0600000000', '1300000000', '1800000000', '1900000000'].includes(profile.psgc!)) {
      await page.waitForFunction(() => [...document.querySelectorAll('svg path, svg text')].every(node => getComputedStyle(node).opacity === '1'));
      await page.screenshot({ path: info.outputPath('regional-profile.png') });
    }
    await page.locator('#back-btn').click();
    await expect(page.locator('[data-profile-key="national"]')).toBeVisible();
    await expect(article).toHaveCount(0);
  });
}

for (const code of ['600000000', '700000000']) {
  test(`legacy Visayas ${code}: current statistics retain explicit coverage notice`, async ({ page }) => {
    await page.goto(`/?alignment=legacy#/region/${code}`);
    await expect(page.locator('svg')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-profile-key]')).toHaveCount(1);
    await expect(page.getByRole('complementary', { name: 'Administrative boundary notice' })).toContainText('not totals for those legacy polygons');
    await page.locator('#detail-body').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect(page.locator('#detail-close')).toBeVisible();
  });
}
