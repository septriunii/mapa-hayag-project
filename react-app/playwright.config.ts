import { defineConfig, request } from '@playwright/test';

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
  timeout: process.env.MAPAHAYAG_TEST_URL ? 60_000 : 30_000,
  use: {
    baseURL,
    storageState,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {},
  },
});
