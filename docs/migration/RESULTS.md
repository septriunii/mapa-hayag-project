# React migration verification

Baseline: `e1ad7e6783956ca96d4158fdb44406d06dd16caf`. Task date: 25 October 2026. No production entry point, domain, geographic source file, or deployment workflow was changed. No migration commit was pushed and nothing was deployed.

## Stage 1 — baseline characterization

- Initialized geographic submodule at its existing gitlink `8eeead560246863c8c820c31ca6fbca81a279477` using a sparse checkout. Git reports no submodule content changes.
- Confirmed dataset MIT license at the pinned revision. The inherited application has no root license file; existing attribution remains.
- Browser characterization executed in installed Microsoft Edge via Playwright, substituting the installed D3 7.9.0 distribution for the legacy CDN dependency. Four entry points passed: root NIR, root legacy alignment, legacy-directory NIR, legacy-directory legacy alignment.
- Verified title, dark background, left 360px drawer, close/reopen controls, 18/17 national regions, NCR's 17 cities/municipalities, Region VI's 5/6 provinces, and reproduced the municipality deep-link defect (restores province instead).
- Resource scan checked 194 JSON files in the four selected submodule directories. All expected municipality file paths exist. No duplicate feature IDs were found within those files.
- Source defects: lowres and medres SGA files (`1909900000`) are empty GeometryCollections instead of FeatureCollections; the BARMM regional feature for this grouping has a null name. Five lowres municipality features have null geometry: `1204712000`, `1705321000`, `403425000`, `405807000`, `806419000`.
- No boundaries or identifiers were repaired or regenerated. Data freshness remains the earlier 2023-derived baseline with selective NIR regrouping. This is not a current PSA reconciliation.

Stage 1 had no production bundle to build; the original application is static HTML. Characterization remains runnable using `test:baseline`.

## Stage 2 — isolated project setup

- Created react-app/ without replacing root index.html. Initial shell test passed (1/1) and initial TypeScript/production build passed.
- Pinned runtime: React/React DOM 19.3.1, D3 7.9.0, Zod 4.6.7.
- Pinned tooling includes TypeScript 7.0.2, Vite 8.3.5, Tailwind 4.3.3, Vitest 5.0.5 and Playwright 1.64.1. See package.json and pnpm-lock.yaml for the complete inventory. No dependency vulnerability audit was executed.
- Installed tooling through the bundled pnpm 11.25.0 because npm was not on this host's PATH. Local Node is 24.22.1.

## Typed configuration/geography and preview

- Types and validation cover geographic levels, PSGC representation, alignment, polygon/collection structure, configuration, color options, duplicate records, and malformed inputs.
- Leading-zero normalization changes representation for lookup only; no old/new PSGC conversion is attempted. Geographic source properties remain intact, including NIR provinces' original codes and Bacolod's legacy ancestry. A separate view-region policy handles alignment without rewriting geometry.
- Shared promise cache coalesces in-flight and repeat requests. Failed network, HTTP, JSON and schema validations are evicted for retry. Hook tests verify StrictMode deduplication and stale-result suppression.
- Geographic services tested against the actual pinned files for both alignments, all regional views and all renderable non-NCR province collections; NCR uses the four medium-resolution district files and a national-region background. SGA fails explicitly; null-geometry records are omitted from rendering with diagnostics.
- National React rendering uses the baseline linear projection and labels. A browser test compared every NIR national SVG path against the legacy D3 formula at 1440×900 with zero mismatches.
- The welcome drawer geometry, typography and computed colors match the baseline for seven measured elements at 1440×900. Browser tests also cover 390px/320px coarse-pointer layout, close/reopen/Escape/focus behavior, invalid alignment, network retry, permanent dark mode despite a saved light preference, safe literal HTML text, and national region selection.
- React owns SVG nodes, details and state. D3 supplies geometry, colors, and zoom interaction calculations. The geographic layer is memoized independently of zoom state. D3/resize/keyboard listeners are cleaned up.
- The first foundation increment stopped at national rendering and region-detail selection. The subsequent drilldown increment below connects these services and route utilities to the React application.

## Foundation increment verification commands and results (historical)

- `check:resources`: completed; no missing files; known malformed/null geometry reported above.
- `test:baseline`: 4 reference entry points passed; known route defect reproduced.
- `test`: 45 tests across 8 suites passed (including actual source data and legacy-copy fidelity).
- `build`: TypeScript check and Vite production build passed.
- `check:build`: 117 copied assets, 3,345,994 bytes; SHA-256 comparison confirmed byte-identical source/output content, including dataset license.
- `test:browser`: 7 tests passed against production-preview output.
- Browser suite also passed against the development server to verify read-only asset mounting (7/7).
- Browser tests use installed Edge; Chromium/Firefox/WebKit cross-browser testing has not been performed.

## Measurements and limits

- First foundation bundle using dynamic D3 namespace lookup: 609.84 KB JS / 193.90 KB gzip. Replacing it with named imports reduced the same preview to approximately 401.63 KB JS / 127.26 KB gzip. Final CSS is approximately 12.71 KB / 3.49 KB gzip. Build outputs may vary slightly with later metadata changes.
- Cache test: simultaneous and repeated access to one validated configuration URL generated one fetch. Repeated province loads generated two total fetches (one province file plus the shared city supplement), including concurrent consumers.
- Initial national browser load fetched one config and one national collection, with no province/municipality downloads. Data remains outside the JavaScript bundle.
- The baseline runner's elapsed-at-snapshot includes fixed waits; it is a diagnostic timestamp, not time-to-interactive or a speed claim. No trustworthy before/after frame-rate, cold-network startup, memory or full-drilldown timing comparison is available yet. The partial React preview cannot establish a whole-application performance improvement.

## Drilldown increment

The isolated React application now renders national → regional → provincial → isolated city/municipality views. `navigation/view.ts` resolves routes against the actual displayed collections and rejects mismatched ancestry. `hooks/useMapNavigation.ts` synchronizes React state with hash changes, browser Back/Forward, reloads, parent navigation, loading/retry and stale-response cleanup. MapCanvas renders each geographic level with the original projection, padding, stroke widths, label sizes and names. D3 supplies zoom calculations and gesture handling; React owns rendered SVG nodes and transforms.

- Ordinary region/province/city drilldown, clickable municipality labels, information panels, choropleth data and responsive layout are connected.
- NIR and legacy alignment preserve source identifiers, including supplementary HUC cities. Navigation uses the active regional hierarchy instead of the source city's older regional code.
- NCR renders 17 medium-resolution city/municipality boundaries over the regional seam background. Parent navigation bypasses districts. Old district-containing city URLs validate district membership and canonicalize to direct city routes.
- Municipality URLs now restore the isolated city instead of stopping at its province, fixing the characterized legacy defect. Direct parent Back works even when a deep link opens in a fresh tab.
- maxDepth stops ordinary drilldown at the configured level and opens details instead; NCR preserves the legacy direct-city bypass.
- Forward geographic zoom (700ms), parent fade (200ms), shape fade (400ms) and delayed labels (350ms + 300ms) are restored. Animations cancel on a newer navigation and respect reduced-motion preferences. Navigation resets both visible and D3 gesture zoom state.
- Added a focus guard after closing the drawer so deferred hamburger focus restoration cannot steal focus from a newly selected polygon.
- Source warnings are exposed in the status indicator. Malformed SGA data fails visibly with Retry and parent navigation available; no boundaries are repaired or invented.

### Current verification

- `test`: **59 tests / 10 suites passed**, including real pinned geographic resources, NIR/HUC ancestry, NCR canonicalization, maxDepth, mismatched-route rejection, stale navigation responses and listener cleanup.
- `build`: TypeScript and Vite production build passed. JavaScript **409.81 KB / 129.84 KB gzip**; CSS **13.40 KB / 3.69 KB gzip**. The increase over the national-only foundation includes the connected navigation and geographic views; it is not a performance regression comparison against the legacy application.
- `check:build`: **117 assets / 3,345,994 bytes**, byte-identical to source files, including dataset license.
- `test:browser --workers=1`: **18 tests passed** against the final production build in installed Microsoft Edge (34.6s for this run, a test-suite duration rather than application speed).
- Browser coverage includes full ordinary/NIR/legacy/HUC/NCR journeys, parent buttons, Back/Forward, city reloads, cached revisits, maxDepth, request errors/Retry, malformed/unknown geography, stale responses, interrupted transitions, pan/zoom reset, responsive sizing, literal HTML metric values and permanent dark mode.
- Exact SVG paths and label text/positions/sizes match legacy rendering for Region IX, Zamboanga del Norte, NCR, Negros Occidental including Bacolod, and isolated Bacolod at 1440×900. The welcome drawer's measured geometry, typography and colors still match. Final targeted development-server visual/focus checks passed (2/2).
- The comparison runner boots legacy routes afresh because its popstate handler can reset an externally edited hash to national when its custom history payload is absent. The isolated-city reference is reached by clicking Bacolod from its province because of the previously characterized legacy city deep-link defect. Legacy sources remain unchanged.
- The actual development server at `http://127.0.0.1:5173/` returned HTTP 200 and passed a separate browser smoke test through Region IX → Zamboanga del Norte → City of Dapitan. Its final city screenshot was visually inspected. The server was restarted outside the restricted sandbox so the user's browser can reach it.

### Files created or modified for drilldown

- Created `react-app/src/navigation/view.ts`, `view.test.ts`, `react-app/src/hooks/useMapNavigation.ts`, `useMapNavigation.test.tsx`, `react-app/tests/geographyFixture.ts` and `react-app/tests/browser/drilldown.spec.ts`.
- Modified `react-app/src/app/App.tsx`, `react-app/src/components/MapCanvas.tsx`, `react-app/src/geography/projection.ts`, `react-app/src/styles/index.css`, `react-app/tests/browser/foundation.spec.ts`, both READMEs and this results document.
- Root production HTML, data/configuration, original boundaries, pinned submodule revision, deployment workflow and both legacy reference copies remain unchanged by this increment. Changes are local, uncommitted and undeployed.

## Remaining work and next gate

1. User acceptance of the full local drilldown and its animations across target desktop/mobile devices. Exact geometry/label comparisons cover representative views; this is not an exhaustive screenshot comparison of every administrative unit or device.
2. Cross-browser verification beyond installed Edge; equivalent-workload startup, frame-rate and memory profiling. No whole-application speed improvement is claimed.
3. Resolve the known malformed SGA and null-geometry source records only through a separately reviewed data correction. Geographic freshness/current PSA reconciliation remains a separate task.
4. Verify the pinned submodule checkout and build settings in a non-production Vercel preview. No authenticated Vercel settings inspection or deployment has been performed.
5. Stop before production-entry replacement, legacy deletion or production deployment until explicitly authorized.

Recommended next step: try the local React app at `http://127.0.0.1:5173/`, exercise ordinary/NIR/NCR drilldown and browser navigation, and complete acceptance checks before considering a production cutover. Use `?alignment=legacy` to compare the 17-region alignment. Local startup commands remain in react-app/README.md.
