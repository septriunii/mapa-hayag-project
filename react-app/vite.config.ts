import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { migrationAssets } from './tooling/assets.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), migrationAssets()],
  test: { globals: true, environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] },
});
