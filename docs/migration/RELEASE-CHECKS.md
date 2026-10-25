# React browser, mobile and performance checks

25 October 2026. Branch: `codex/react-migration-drilldown`. Original reference:
`e1ad7e6783956ca96d4158fdb44406d06dd16caf`. This increment follows `bd47757`.
Production, main, original HTML, legacy copies, source geography and the submodule
pin remain unchanged. The Vercel Preview-only build guard remains enabled.

## Browser and mobile verification

The production Vite build is tested with Playwright on Windows, using Chromium
156.0.8078.4, Firefox 157 and WebKit 27.2. The device projects emulate viewports,
touch input and browser characteristics; they are not physical Android/iOS tests.
WebKit on Windows is not a substitute for testing shipping Safari on Apple hardware.

**Final result: all 63 cases passed against the production build (2.4 minutes).**
Browser results and screenshots are local ignored artifacts; each test run can
replace the previous output directory.

| Project | Cases | Coverage |
| --- | ---: | --- |
| Chromium desktop | 18 | Full drilldown, history, reloads, caching, errors, original SVG/UI parity |
| Firefox desktop | 18 | Same desktop suite |
| WebKit desktop | 18 | Same desktop suite |
| Pixel 7 / Chromium | 3 | Touch drilldown, narrow controls, NCR, orientation and pan/reset |
| iPhone 13 / WebKit | 3 | Same mobile suite |
| iPad gen 7 / WebKit | 3 | Same mobile suite |

Desktop coverage includes NIR and legacy Bacolod/HUC ancestry, NCR's 17 cities and
old district URLs, configuration maxDepth, stale responses, interrupted animations,
retry after errors, safe literal HTML content and permanently dark styling despite
a saved light preference. There is intentionally no light-mode switch.

Mobile tests use native pointer/touch input to select visible polygons and labels,
reload an isolated city, use parent navigation, and close/reopen the left drawer.
They also test 320px width, 844x390 landscape and return to portrait. The D3 pan
check dispatches synthesized TouchEvents; physical gesture feel remains a manual
acceptance item. Screenshots are saved under ignored `react-app/test-results/`.

Fixed issues:

- At 320px, a long region name in the parent Back control overlapped the hamburger.
  Its width is now constrained and the text truncates, preserving its accessible
  name and the desktop layout.
- Explicit Times New Roman inheritance produced a one-pixel WebKit panel-height
  difference. Restoring the original generic serif inheritance matches the
  baseline's visible text metrics and panel geometry across all three engines.
- A follow-up rotation check exposed intermittently stale viewport dimensions.
  The viewport hook now rechecks after subscribing, measures resize events on
  the next frame and cancels pending work on unmount. Two focused lifecycle tests
  cover missed initial resizes, settled measurements, coalescing and cleanup;
  mobile browser cases now exercise repeated portrait/landscape changes.

Test portability changes compare actual glyph widths and visible text colors
instead of platform-specific font aliases or unused inherited parent colors.
WebKit SVG label input uses native rendered coordinates verified by hit testing;
tests do not force DOM clicks through obscured labels. Dense overlapping labels
remain inherited behavior, particularly on small screens; pan/zoom is available.

## Performance method

See [per-run evidence and medians](performance-evidence.json). Each phase contains
five runs per app per profile (20 workflows), alternating app order with fresh
browser contexts. Both apps use the same local gzip/ETag server, pinned D3 7.9.0
and geographic files. The unchanged original HTML's CDN script is served locally
for this comparison; source files are never rewritten. No request interception
disables the HTTP cache. Cold refers to browser/application cache, not OS disk cache.

The workload opens national view, drills into Region VII, Cebu and Cebu City,
returns to the province and region, revisits the province, and exercises zoom.
Desktop is 1440x900 without throttling. Mobile is 390x844 with 4x CPU slowdown,
80ms latency, 1.6Mbps download and 750Kbps upload. Host: Ryzen 5 5600G, Windows,
Node 24.22.1, headless Chromium 156.0.8078.4. The runs are local lab measurements,
not Vercel CDN timings, field data or physical-device frame-rate measurements.

The startup CPU profile identified Zod traversal/allocation among the costs.
Coordinate validation now checks every ring and coordinate without cloning the
large nested arrays. Collection, feature, property, PSGC, name, finite-number,
geographic-range and ring-closure validation remain. Twenty new tests cover
invalid geometries, holes, multipolygons, source identity and malformed properties;
the existing tests continue to exercise the real pinned resources. Coordinates
and boundaries are not simplified, regenerated or modified.

### Medians after the optimization

| Measurement | Original | React |
| --- | ---: | ---: |
| Desktop national DOM ready | 74ms | 108ms |
| Desktop national fully visible | 695ms | 758ms |
| Throttled mobile national DOM ready | 1,995ms | 2,366ms |
| Throttled mobile national fully visible | 2,591ms | 3,015ms |
| Throttled mobile province revisit DOM ready | 834ms | 752ms |
| Requests during that cached revisit | 1 revalidation | 0 |
| Initial compressed response bodies, desktop/mobile | 289KB | 315KB |
| Initial JSON requests | 3 | 2 |
| Retained JS heap after workflow, mobile | 3.17MB | 4.56MB |
| Zoom animation-frame interval p95, mobile | 16.7ms | 16.7ms |

Times include the original application animations; DOM ready is a specific map
milestone, not a standardized time-to-interactive metric. Body totals exclude
protocol/header overhead. Heap is sampled after forced garbage collection and
does not establish leak freedom. The frame interval reflects this headless 60Hz
setup and does not establish physical-device FPS.

Compared with the previous React candidate, the optimization reduced retained
mobile JS heap from **6.50MB to 4.56MB (about 30%)**, and startup heap from 6.79MB
to 5.03MB (about 26%). Desktop retained heap fell from 6.51MB to 4.57MB. Cold
mobile DOM readiness changed from 2,430ms to 2,366ms, but the original also varied
between phases; five samples do not justify attributing that small timing change
entirely to the optimization. The memory reduction is the clearest improvement.

React still has higher startup transfer, execution and retained-memory costs than
the original. Cold mobile DOM readiness is approximately 371ms (19%) slower in
this profile; cached province revisit is approximately 82ms (10%) faster. No
whole-application speedup is claimed. Accept this tradeoff or set a further startup
budget before cutover; removing validation or altering boundaries to improve a
score would undermine this migration's priorities.

The committed evidence records the measured candidates' source-diff hashes and
bundle paths. Subsequent font-inheritance and viewport-lifecycle corrections do
not change the validation algorithm; the performance figures describe the
recorded candidate rather than a separate benchmark of these final corrections.
Full raw browser profiles/results are ignored local artifacts.

## Build and data checks

- 81 application tests across 12 suites, including 20 new validation cases and two
  viewport lifecycle cases.
- Four deployment-guard tests; Production remains rejected.
- TypeScript and production Vite build succeed: JS 408.77KB / gzip 129.57KB;
  CSS 13.52KB / gzip 3.71KB.
- 117 copied assets / 3,345,994 bytes match source SHA-256 values on this Windows
  checkout. The dataset license is included. Existing cloud CRLF/LF normalization
  can change text byte counts without changing parsed coordinates or PSGCs.

Changed runtime files are `react-app/src/app/App.tsx`,
`src/styles/index.css`, `src/hooks/useViewport.ts` and
`src/geography/validate.ts`. New focused tests cover viewport lifecycle and
geometry validation; the browser suite adds mobile projects and SVG native-input
helpers. Playwright configuration, package scripts, the performance/profile
runners, artifact ignore rules and migration documentation complete this increment.

## Reproduce

Use the pinned Node/pnpm setup in [the React README](../../react-app/README.md).
From the repository root in PowerShell:

```powershell
pnpm --dir react-app test
pnpm --dir react-app test:deployment
pnpm --dir react-app build
pnpm --dir react-app check:build
pnpm --dir react-app exec playwright install chromium firefox webkit
$env:MAPAHAYAG_CROSS_BROWSER = '1'
pnpm --dir react-app test:browser --workers=1
$env:MAPAHAYAG_PERF_SAMPLES = '5'
$env:MAPAHAYAG_PERF_LABEL = 'current'
pnpm --dir react-app test:performance
```

If browsers are stored outside Playwright's default cache, set
`PLAYWRIGHT_BROWSERS_PATH`. The cross-browser matrix uses its downloaded engines;
`PLAYWRIGHT_EXECUTABLE_PATH` applies to the default single-browser suite only.
Do not run other browser jobs during performance sampling. Reports go to ignored
`react-app/performance-results/`. For a startup CPU profile, first run
`pnpm exec vite build --sourcemap --outDir performance-results/profile` from
react-app, then `node scripts/profile-startup.mjs`. This separate source-mapped
build is confined to that ignored directory and is not published.

## Remaining acceptance gates

- Try actual target phones/tablets and Safari, including touch feel, label density,
  orientation, font loading and accessibility. Automated emulation reduces risk
  but does not replace this acceptance.
- Source defects remain: malformed/unnamed SGA grouping and five null-geometry
  municipalities. Errors/warnings are surfaced without inventing boundaries.
  Current PSA reconciliation is a separate data task.
- Review the measured cold-start tradeoff and production-cutover plan. Retain the
  original deployment for rollback and keep legacy implementations for comparison.
- Replacing main, changing the Preview-only guard and deploying production require
  separate authorization. This increment does none of those actions.
