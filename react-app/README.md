# MAPA-Hayag React foundation

This is an isolated migration preview, not the production application. Root `index.html` and `index-no-nir.html` remain the deployed entry points; `legacy/` contains runnable reference copies. Baseline: `e1ad7e6`. See [baseline contract](../docs/migration/BASELINE.md) and [verification results](../docs/migration/RESULTS.md).

## Requirements and local use

Use Node.js 24 LTS and pnpm 11.25.0 (the packageManager field and lockfile pin the tooling). A normal recursive checkout initializes the geographic submodule:

```sh
git submodule update --init --depth=1 --filter=blob:none
pnpm --dir react-app install --frozen-lockfile
pnpm --dir react-app dev
```

The full geographic repository is large. For a smaller checkout use Git's sparse checkout for `2023/geojson/country/lowres`, `2023/geojson/regions/lowres`, `2023/geojson/provdists/lowres`, and `2023/geojson/provdists/medres`; keep the exact gitlink revision. This task initialized those directories without changing the pinned commit.

Open the local URL printed by Vite. Default alignment is NIR. Use `/?alignment=legacy` for the 17-region alignment. The validated configuration also accepts `alignment: "nir" | "legacy"`; existing data.json without this field defaults to NIR. Invalid alignment values produce a visible error.

Root data.json is mounted read-only in development. geoBasePath resolves relative to its configuration URL, preserving existing relative and HTTP asset bases. PSGCs accept numbers or digit strings; leading zeros are normalized only for matching. No current/old code conversion or new administrative classification is inferred. Duplicate records and malformed configuration fail validation rather than silently overwriting data. Display values and descriptions are React text, so supplied HTML is displayed literally.

## Checks

```sh
pnpm --dir react-app check:resources
pnpm --dir react-app test
pnpm --dir react-app build
pnpm --dir react-app check:build
pnpm --dir react-app exec playwright install chromium
pnpm --dir react-app test:baseline
pnpm --dir react-app test:browser
pnpm --dir react-app preview
```

Browser tests can use an existing Chromium/Edge executable instead of installing browsers. For example in PowerShell:

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
pnpm --dir react-app test:baseline
pnpm --dir react-app test:browser
```

`MAPAHAYAG_TEST_DEV=1` runs the same browser suite against the development server instead of dist. The baseline runner serves root/legacy files and substitutes the locally installed D3 7 distribution for the external CDN response. It never rewrites source files. The build verifier compares SHA-256 hashes for copied assets. Browser artifacts live in ignored test-results/.

For the Chromium/Firefox/WebKit desktop and emulated Pixel/iPhone/iPad matrix, install all three Playwright browsers and set `MAPAHAYAG_CROSS_BROWSER=1` before running `test:browser --workers=1`. The default single-browser suite continues to support an installed Edge executable. `test:performance` compares the production bundle with unchanged original HTML on the same local gzip server, with five runs per app/profile; it writes ignored performance-results/. See the [release checks](../docs/migration/RELEASE-CHECKS.md) for results, reproduction commands and emulation limits.

For manual legacy comparison, serve the repository root using any static HTTP server, then open `/legacy/index.html` or `/legacy/index-no-nir.html`. The root production pages work as before. Do not open via file:// because the applications fetch JSON.

## Implemented in this increment

- React/TypeScript/Vite/Tailwind project and pinned dependencies.
- National → regional → provincial → isolated city/municipality rendering, existing linear projections and labels, pan/zoom, keyboard/mouse polygon selection, safe details, approved dark left drawer/hamburger and responsive sizing.
- Configuration validation, typed GeoJSON/PSGC handling, NIR/legacy asset policy, NCR medium-resolution composition, and supplementary city assembly.
- Shared validated promise cache, failed-request retry, StrictMode request deduplication, stale-result suppression and listener cleanup.
- Hash routing, deep-link reloads, browser Back/Forward, explicit parent Back controls, validated ancestry and maxDepth behavior. NCR bypasses districts; older NCR district city URLs canonicalize to direct city URLs. NIR and supplementary city routes preserve the active view hierarchy without changing their source codes.
- Geographic zoom/fade transitions with cancellation, reduced-motion support, zoom reset on navigation and stale-response suppression. Source geometry warnings remain visible in the status indicator.

The React application supports full drilldown locally and on Vercel. Reference comparisons cover exact SVG paths and labels for ordinary regional/provincial views, NCR, NIR province/HUC composition and an isolated city, plus the welcome drawer geometry and styling. Cross-browser checks and equivalent-workload performance profiling are recorded in the release checks. Actual-device/animation acceptance remains; emulated devices do not establish physical Safari compatibility or touch performance.

The source includes GeoJSON only in its runtime paths; no TopoJSON decoder is introduced or needed for parity. No geometry is regenerated. Known null/malformed source geometry is reported; it is not repaired or invented.

## Vercel React preview

[Open the verified React preview](https://mapahayag-5oiie6do2-septriuniis-projects.vercel.app/), or [the latest branch preview](https://mapahayag-ph-git-codex-react-migrat-3e280f-septriuniis-projects.vercel.app/). Sign in with your Vercel account if prompted. Production remains at the original domain.

The build emits self-contained static files in react-app/dist. The asset plugin copies the existing configuration, geographic overrides, runtime geographic files and dataset license into dist and fails if required files are absent. It includes all low-resolution province files and the four medium-resolution NCR district files, avoiding the unused medium-resolution provinces and all higher-resolution/barangay datasets.

The migration branch contains root `vercel.json` for the existing `mapahayag-ph` project's Preview environment. The repository root stays the build root so Vite can copy the adjacent geographic datasets. Installation uses pinned pnpm 11.25.0 and the frozen lockfile; the build runs TypeScript/Vite and verifies copied asset hashes. Output is `react-app/dist`. The existing Vercel project uses Node 24. The public HTTPS geographic submodule must be available at its recorded gitlink revision; missing assets fail the build. Do not point the root directory at react-app, because that would exclude the adjacent data.

`scripts/check-preview-target.mjs` scopes Vercel cloud builds to the reviewed `codex/react-migration-drilldown` branch. The guard runs before installation and before building. The production domain now serves this reviewed React release; `main` remains available as the original reference branch.

To run the browser suite against a deployed preview, set `MAPAHAYAG_TEST_URL` to its HTTPS origin and run `test:browser`. Protected previews can use a temporary deployment share token supplied through `MAPAHAYAG_PREVIEW_BYPASS` in the process environment. The runner exchanges its `_vercel_share` URL parameter for cookies in memory, including for the mobile browser context; it never saves the token or adds it to third-party requests. Do not commit share tokens. Use `test:deployment` for the deployment-target guards, and `check:preview` to compare all deployed geographic JSON values, license text and JS/CSS bundles with the local build. These checks use Node 24. Cloud deployment and browser-test results are recorded in docs/migration/RESULTS.md.

## Attribution

Application foundation: [tordecilla/ph-drilldown-map](https://github.com/tordecilla/ph-drilldown-map). Preserve the root README credit. No new license or relicensing claim is made for the inherited application code.

Geographic source: [James Faeldon's philippines-json-maps](https://github.com/faeldon/philippines-json-maps), pinned at `8eeead560246863c8c820c31ca6fbca81a279477`. Its MIT notice was verified locally after initialization and is copied unchanged into production-preview output at `philippines-json-maps/LICENSE`. NIR override provenance remains in the existing generator script.
