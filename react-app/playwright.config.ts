import { defineConfig, devices, request } from '@playwright/test';

const baseURL = process.env.MAPAHAYAG_TEST_URL ?? 'http://127.0.0.1:4173';
let storageState;
if (process.env.MAPAHAYAG_PREVIEW_BYPASS) {
  // Exchange a temporary deployment-scoped share token for cookies once.
  // Never attach the token globally to third-party requests or save it to disk.
  const context = await request.newContext();
  try {
    const target = new URL(baseURL);
    if (target.protocol !== 'https:' || !target.hostname.endsWith('.vercel.app')) throw new Error('Use the managed HTTPS Vercel preview URL for share-token authentication');
    target.searchParams.set('_vercel_share', process.env.MAPAHAYAG_PREVIEW_BYPASS);
    let response = await context.get(target.href, {
      maxRedirects: 0,
    });
    const redirect = response.headers().location;
    if (redirect && response.status() >= 300 && response.status() < 400) {
      const next = new URL(redirect, target);
      if (next.origin !== target.origin) throw new Error('Preview authentication redirected outside the deployment');
      response = await context.get(next.href, { maxRedirects: 0 });
    }
    if (!response.ok()) throw new Error(`Preview authentication failed: HTTP ${response.status()}`);
    storageState = await context.storageState();
  } finally { await context.dispose(); }
}

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  projects: process.env.MAPAHAYAG_CROSS_BROWSER === '1' ? [
    { name: 'chromium-desktop', testIgnore: '**/mobile.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', testIgnore: '**/mobile.spec.ts', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', testIgnore: '**/mobile.spec.ts', use: { ...devices['Desktop Safari'] } },
    { name: 'android-chromium', testMatch: '**/mobile.spec.ts', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', testMatch: '**/mobile.spec.ts', use: { ...devices['iPhone 13'] } },
    { name: 'ipad-webkit', testMatch: '**/mobile.spec.ts', use: { ...devices['iPad (gen 7)'] } },
  ] : [{
    name: 'edge', testIgnore: '**/mobile.spec.ts', use: {
      browserName: 'chromium',
      launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {},
    },
  }],
  timeout: process.env.MAPAHAYAG_TEST_URL ? 60_000 : 30_000,
  use: {
    baseURL,
    storageState,
  },
});
