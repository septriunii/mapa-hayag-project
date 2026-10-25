import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { request } from '@playwright/test';
import configuration from '../playwright.config.ts';

if (!process.env.MAPAHAYAG_TEST_URL) throw new Error('Set MAPAHAYAG_TEST_URL to the deployed preview origin');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else {
      const relative = path.relative(root, filename).split(path.sep).join('/');
      if (relative !== 'index.html') files.push({ filename, relative });
    }
  }
}
await walk(root);
const context = await request.newContext({ baseURL: configuration.use.baseURL, storageState: configuration.use.storageState });
let cursor = 0, jsonFiles = 0, otherFiles = 0;
try {
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < files.length) {
      const { filename, relative } = files[cursor++];
      const response = await context.get('/' + relative);
      assert.equal(response.status(), 200, `HTTP error: ${relative}`);
      const source = await readFile(filename), deployed = await response.body();
      if (relative.endsWith('.json')) {
        // Git checks text out as CRLF on Windows and LF on Linux. Compare
        // every parsed value, including coordinates and PSGC properties.
        assert.deepEqual(JSON.parse(deployed.toString()), JSON.parse(source.toString()), `Different JSON: ${relative}`);
        jsonFiles++;
      } else if (relative.startsWith('assets/')) {
        assert.ok(source.equals(deployed), `Different bundle: ${relative}`);
        otherFiles++;
      } else {
        assert.equal(deployed.toString().replaceAll('\r\n', '\n'), source.toString().replaceAll('\r\n', '\n'), `Different asset: ${relative}`);
        otherFiles++;
      }
      await response.dispose();
    }
  }));
  console.log(`Verified ${jsonFiles} deployed JSON files and ${otherFiles} other assets against the local build.`);
} finally { await context.dispose(); }
