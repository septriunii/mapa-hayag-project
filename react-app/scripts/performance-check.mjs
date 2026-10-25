import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

// Controlled A/B comparison: unchanged original HTML versus the production
// React bundle, same server, gzip/cache policy, D3 version, data and machine.
// Original D3's CDN URL is served locally; no page.route() interception is used
// because interception disables the browser HTTP cache.
const app = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(app, '..');
const samples = Number(process.env.MAPAHAYAG_PERF_SAMPLES ?? 5);
const label = process.env.MAPAHAYAG_PERF_LABEL ?? 'current';
assert.ok(Number.isInteger(samples) && samples >= 1 && samples <= 20);
assert.match(label, /^[a-z0-9-]+$/);
const requests = [], prepared = new Map();
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1);
    let content = prepared.get(relative);
    if (!content) {
      let filename;
      if (relative === 'legacy.html') filename = path.join(repo, 'index.html');
      else if (relative === 'react.html') filename = path.join(app, 'dist/index.html');
      else if (relative === 'vendor/d3.min.js') filename = path.join(app, 'node_modules/d3/dist/d3.min.js');
      else filename = path.resolve(relative.startsWith('assets/') ? path.join(app, 'dist') : repo, relative);
      assert.ok(filename.startsWith(repo + path.sep));
      let body = await readFile(filename);
      if (relative === 'legacy.html') body = Buffer.from(body.toString().replace('https://unpkg.com/d3@7/dist/d3.min.js', '/vendor/d3.min.js'));
      const type = relative.endsWith('.json') ? 'application/json' : relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html';
      content = { body, gzip: gzipSync(body), type, etag: '"' + createHash('sha256').update(body).digest('hex') + '"' };
      prepared.set(relative, content);
    }
    const notModified = req.headers['if-none-match'] === content.etag;
    const body = req.headers['accept-encoding']?.includes('gzip') ? content.gzip : content.body;
    res.setHeader('Content-Type', content.type);
    res.setHeader('Cache-Control', relative.endsWith('.html') ? 'no-store' : relative.endsWith('.json') ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable');
    res.setHeader('ETag', content.etag);
    if (body === content.gzip) res.setHeader('Content-Encoding', 'gzip');
    requests.push({ path: relative, status: notModified ? 304 : 200, bodyBytes: notModified ? 0 : body.length });
    res.writeHead(notModified ? 304 : 200).end(notModified ? undefined : body);
  } catch { res.writeHead(404).end(); }
});

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, cpu: 1, latency: 0, download: -1, upload: -1 },
  { name: 'mobile-constrained', viewport: { width: 390, height: 844 }, cpu: 4, latency: 80, download: 1_600_000 / 8, upload: 750_000 / 8 },
];
const report = {
  label, date: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  baseline: execFileSync('git', ['rev-parse', 'main'], { cwd: repo, encoding: 'utf8' }).trim(),
  workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim()),
  appDiffSha256: createHash('sha256').update(execFileSync('git', ['diff', 'HEAD', '--', 'react-app/src'], { cwd: repo })).digest('hex'),
  environment: { platform: process.platform, node: process.version, cpu: os.cpus()[0].model, cores: os.cpus().length, headless: true },
  samplesPerAppPerProfile: samples, profiles, runs: [],
  method: 'Fresh browser contexts; alternating app order; same-origin gzip/ETag server and pinned D3; DOM-ready and fully-visible milestones include the apps\' animations. Cold means fresh HTTP/application cache, not a cold OS disk cache. Mobile uses 4x CPU and 80ms/1.6Mbps/750Kbps emulation, not a physical phone. Heap after forced GC is footprint, not a leak proof.',
};

async function installObserver(page) {
  await page.addInitScript(() => {
    window.__bench = { frames: [], longTasks: [], collecting: true, last: 0, start: 0 };
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (window.__bench.collecting) window.__bench.longTasks.push(entry.duration); }).observe({ type: 'longtask', buffered: true });
    }
    const frame = time => {
      const b = window.__bench;
      if (b.collecting && b.last) b.frames.push(time - b.last);
      b.last = time;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

async function waitReady(page, kind, level, hash) {
  await page.waitForFunction(({ kind, level, hash }) => {
    if (kind === 'react') return document.querySelector('svg')?.getAttribute('data-view') === hash && document.querySelector('svg')?.getAttribute('aria-busy') === 'false';
    return typeof currentView !== 'undefined' && currentView === level && !!document.querySelector('svg path');
  }, { kind, level, hash }, { timeout: 30_000 });
}
async function fullyVisible(page) {
  await page.waitForFunction(() => {
    const nodes = [...document.querySelectorAll('svg path, svg text')];
    return nodes.length > 0 && nodes.every(node => Number(getComputedStyle(node).opacity) >= 0.999);
  }, undefined, { timeout: 10_000 });
}
async function timing(page, start, domReadyMs) {
  return page.evaluate(({ start, domReadyMs }) => {
    const b = window.__bench;
    b.collecting = false;
    const frames = [...b.frames].sort((a, b) => a - b);
    return { domReadyMs, fullyVisibleMs: performance.now() - start, frameP95Ms: frames[Math.floor((frames.length - 1) * 0.95)] ?? 0, framesOver32ms: frames.filter(value => value > 32).length, frames: frames.length, longTaskMs: b.longTasks.reduce((sum, value) => sum + value, 0) };
  }, { start, domReadyMs });
}
async function begin(page) {
  return page.evaluate(() => { const b = window.__bench; b.frames = []; b.longTasks = []; b.last = 0; b.collecting = true; return performance.now(); });
}
async function metrics(session) {
  await session.send('HeapProfiler.collectGarbage');
  const { metrics } = await session.send('Performance.getMetrics');
  const values = Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
  return { retainedHeapBytes: values.JSHeapUsedSize, scriptMs: values.ScriptDuration * 1000, taskMs: values.TaskDuration * 1000, nodes: values.Nodes };
}
async function clickCode(page, code) {
  await page.evaluate(code => {
    const element = [...document.querySelectorAll('svg path')].find(element => element.getAttribute('data-psgc') === code || String(element.__data__?.properties?.adm1_psgc) === code && element.classList.contains('region') || String(element.__data__?.properties?.adm2_psgc) === code && element.classList.contains('province') || String(element.__data__?.properties?.adm3_psgc) === code && (element.classList.contains('municity') || element.classList.contains('huc-city')));
    if (!element) throw new Error('Missing polygon ' + code);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, code);
}
async function step(page, kind, name, level, hash, action) {
  const start = await begin(page);
  await action();
  await waitReady(page, kind, level, hash);
  const domReadyMs = await page.evaluate(start => performance.now() - start, start);
  await fullyVisible(page);
  return { name, ...await timing(page, start, domReadyMs) };
}

let browser;
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  report.environment.browser = browser.version();
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const profile of profiles) for (let sample = 0; sample < samples; sample++) {
    for (const kind of sample % 2 ? ['react', 'legacy'] : ['legacy', 'react']) {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.cpu > 1, hasTouch: profile.cpu > 1 });
      const page = await context.newPage();
      await installObserver(page);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const session = await context.newCDPSession(page);
      await session.send('Performance.enable');
      await session.send('Network.enable');
      await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
      await session.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency, downloadThroughput: profile.download, uploadThroughput: profile.upload });
      const firstRequest = requests.length;
      await page.goto(`${origin}/${kind}.html`, { waitUntil: 'domcontentloaded' });
      await waitReady(page, kind, 'national', '#/');
      const domReadyMs = await page.evaluate(() => performance.now());
      await fullyVisible(page);
      const startup = await timing(page, 0, domReadyMs);
      startup.network = requests.slice(firstRequest);
      startup.memory = await metrics(session);
      const regionHash = '#/region/700000000', provinceHash = regionHash + '/province/702200000';
      const steps = [];
      steps.push(await step(page, kind, 'region', 'region', regionHash, () => clickCode(page, '700000000')));
      steps.push(await step(page, kind, 'province', 'province', provinceHash, () => clickCode(page, '702200000')));
      steps.push(await step(page, kind, 'city', 'municity', provinceHash + '/municity/730600000', () => clickCode(page, '730600000')));
      steps.push(await step(page, kind, 'back-province', 'province', provinceHash, () => page.locator('#back-btn').dispatchEvent('click')));
      steps.push(await step(page, kind, 'back-region', 'region', regionHash, () => page.locator('#back-btn').dispatchEvent('click')));
      const warmStart = requests.length;
      steps.push(await step(page, kind, 'province-revisit', 'province', provinceHash, () => clickCode(page, '702200000')));
      const revisitNetwork = requests.slice(warmStart);
      const zoomStart = await begin(page);
      for (let i = 0; i < 24; i++) {
        await session.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: profile.viewport.width * 0.65, y: profile.viewport.height * 0.5, deltaX: 0, deltaY: i < 12 ? -25 : 25 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      }
      const zoom = await timing(page, zoomStart, null);
      const run = { kind, profile: profile.name, sample: sample + 1, startup, steps, zoom, revisitNetwork, memoryAfterWorkflow: await metrics(session), network: requests.slice(firstRequest), errors };
      assert.equal(errors.length, 0, errors.join('\n'));
      report.runs.push(run);
      console.log(`${profile.name} ${sample + 1}/${samples} ${kind}: national DOM ${startup.domReadyMs.toFixed(0)}ms, visible ${startup.fullyVisibleMs.toFixed(0)}ms; revisit ${steps.at(-1).domReadyMs.toFixed(0)}ms/${revisitNetwork.length} requests; zoom p95 ${zoom.frameP95Ms.toFixed(1)}ms`);
      await context.close();
    }
  }
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  report.summary = [];
  for (const profile of profiles) for (const kind of ['legacy', 'react']) {
    const runs = report.runs.filter(run => run.profile === profile.name && run.kind === kind);
    report.summary.push({ profile: profile.name, kind, samples: runs.length,
      nationalDomMs: median(runs.map(run => run.startup.domReadyMs)), nationalVisibleMs: median(runs.map(run => run.startup.fullyVisibleMs)),
      startupBodyBytes: median(runs.map(run => run.startup.network.reduce((sum, request) => sum + request.bodyBytes, 0))),
      startupJsonRequests: median(runs.map(run => run.startup.network.filter(request => request.path.endsWith('.json')).length)),
      provinceRevisitDomMs: median(runs.map(run => run.steps.at(-1).domReadyMs)), revisitRequests: median(runs.map(run => run.revisitNetwork.length)),
      startupScriptMs: median(runs.map(run => run.startup.memory.scriptMs)), startupHeapBytes: median(runs.map(run => run.startup.memory.retainedHeapBytes)),
      retainedHeapBytes: median(runs.map(run => run.memoryAfterWorkflow.retainedHeapBytes)),
      zoomFrameP95Ms: median(runs.map(run => run.zoom.frameP95Ms)),
    });
  }
  await mkdir(path.join(app, 'performance-results'), { recursive: true });
  const output = path.join(app, 'performance-results', `${label}.json`);
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report: ${output}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
