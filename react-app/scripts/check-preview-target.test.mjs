import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./check-preview-target.mjs', import.meta.url));
function run(overrides) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, VERCEL: '', VERCEL_ENV: '', VERCEL_GIT_COMMIT_REF: '', ...overrides }, encoding: 'utf8',
  });
}
test('accepts the approved Git preview target', () => {
  assert.equal(run({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/react-migration-drilldown' }).status, 0);
});
test('rejects a production deployment before installation/build', () => {
  const result = run({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'codex/react-migration-drilldown' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Preview only/);
});
test('rejects an unspecified cloud environment and an unapproved branch', () => {
  assert.notEqual(run({ VERCEL: '1' }).status, 0);
  assert.notEqual(run({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' }).status, 0);
});
test('allows local validation without Vercel environment variables', () => {
  assert.equal(run({}).status, 0);
});
