# Geographic typography review

27 October 2026. React branch: `codex/react-migration-drilldown`.
This increment builds on the uncommitted Assassin's Creed IV cartographic theme
recorded in CARTOGRAPHIC-THEME.md. That work is retained. Production remains at
the previously released version; this increment is local for review.

## Current font revision — Segoe UI

The user subsequently supplied a Windows browser interface screenshot and asked
to use that font style for both geographic labels and the sidebar information.
The active font is now `'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont,
Arial, sans-serif`, centralized as `--font-ui`; `--font-map-label` reuses it.
Map labels remain regular (400), with the existing gray hierarchy, sizes, halo,
wrapping and placement. Sidebar headings, descriptions, parents, field labels,
values and empty-state text now share this font; headings retain semibold (600).
The original drawer shell and map/navigation structure remain intact.

This revision uses installed system fonts and has no font-download requests.
The unused Roboto font/license trial files are omitted from the release;
Segoe UI uses the installed system font stack. Geographic asset verification is
back to 117 byte-identical assets (3,345,994 bytes). The initial Roboto iteration
and its historical verification are recorded below, superseded by this revision.
Updated screenshots are in ignored `react-app/theme-results/segoe/`; the review
URL is http://127.0.0.1:5173/?review=segoe-ui.

The Segoe UI production build, TypeScript checks and all 89 application tests
passed. All 15 focused browser cases passed in 55.9 seconds: sidebar font/shell,
source names, dense-label placement and zoom/input in Chromium, Firefox and
WebKit, plus touch drilldown on emulated Pixel, iPhone and iPad. A Firefox text-box
measurement exposed a small vertical collision with Segoe UI; placement padding
now reserves additional room for font extents and the halo. This checks the font
change without claiming a new full 84-case run. No production deployment occurred.

The user approved pushing this revision and deploying it to the existing
production domain on 27 October 2026. The sections below preserve the initial
Roboto review history; the Segoe UI revision above is the release configuration.

## Initial Roboto design and palette (superseded)

The supplied screenshot of [Shades of Grey by Adam Krogh](https://snazzymaps.com/style/38/shades-of-grey)
guides the typography: regular sans serif, a restrained hierarchy, compact full
names and a fine dark halo. Its map colors are not imported. Water `#24282B`,
land `#4D6059` and administrative linework `#7F8D89` remain unchanged.

Labels use self-hosted Roboto Regular (400). The Latin WOFF2 file is 21,884 bytes,
downloaded from the official Google Fonts Roboto v51 stylesheet. Vite bundles it
with a content hash; no runtime requests go to Google Fonts. Arial/sans-serif
remains the fallback. The unmodified SIL Open Font License is included at
`fonts/OFL.txt` and copied into build output. Sidebar and control typography remain
unchanged. No new JavaScript package, geographic dataset or mapping engine was added.

All geographic typography settings live in `react-app/src/styles/index.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--font-map-label` | `'Roboto', Arial, sans-serif` | Geographic names only |
| `--map-label-weight` | `400` | Regular glyphs |
| `--color-map-label` | `#B8C0BA` | Regions and isolated city name |
| `--color-map-label-secondary` | `#AEB7B0` | Provincial names |
| `--color-map-label-minor` | `#A8B3AB` | Cities/municipalities, including NCR |
| `--color-map-label-halo` | `#24282B` | Thin charcoal outline |
| `--map-label-halo-width` | `1.1px` | Halo under the fill; no blur/shadow |
| `--map-label-region-size` | `12px` | National region names |
| `--map-label-province-size` | `11.5px` | Regional province/division names |
| `--map-label-municity-size` | `10.5px` | Provincial/NCR city names |
| `--map-label-city-size` | `13px` | Isolated city name |
| `--map-label-mobile-scale` | `0.95` | Size adjustment below 600px |
| `--map-label-tracking` | `0.05px` | Compact natural spacing |
| `--map-label-line-height` | `1.18` | Wrapped-name line height |
| `--map-label-region-width` | `110px` | Region wrapping width |
| `--map-label-width` | `100px` | Other wrapping width |

The proposed very dark grays were adjusted upward for the sage land background,
while staying below the previous near-white labels. Contrast against the charcoal
halo is 7.99:1 / 7.22:1 / 6.86:1 for major/secondary/minor text. Against unoutlined
land those values are only 3.60:1 / 3.26:1 / 3.10:1; the halo is therefore needed
on these surfaces. These numerical color ratios are not a claim of complete
application accessibility or physical-screen readability certification.

## Placement and zoom behavior

- The existing GeoJSON properties remain the only name source. National names
  retain the existing parenthetical display convention (e.g. `NIR`); other names
  remain complete. Long names wrap at word boundaries instead of being truncated
  with ellipses or assigned new abbreviations. No road or barangay names are added.
- Anchor calculations use the same projection as the map. Centroids that lie in
  water/holes or outside a concave/multipart feature move to an interior point
  on an actual source polygon, preferring the largest island when necessary.
  An extremely thin polygon can fall back to a source edge point.
- A deterministic bounded search prefers an interior label center, then nearby
  free space. Larger projected areas are placed first. All source names remain
  present; labels are not hidden to make collision checks pass. At the fitted
  view, placement also avoids horizontal viewport clipping.
- In dense areas, some text necessarily moves outside its small feature. No new
  leader lines or panels are introduced. The search is bounded to nearby offsets,
  so arbitrary untested configurations cannot be guaranteed collision-free.
- Font measurements use the actual loaded Roboto metrics. Re-measurement after
  font loading avoids retaining fallback-font widths. Projected anchors and
  measured layouts are memoized. Pan frames only move the parent SVG group;
  placement recalculates at the end of a zoom gesture. All added D3 listeners and
  asynchronous font callbacks clean up on unmount.
- A reciprocal SVG/CSS scale cancels geographic zoom for the text, halo and
  offsets. Geographic anchors still move with the map, while text remains at the
  configured screen size during wheel zoom and animated drilldown.
- National/regional/NCR text is transparent to pointer input, preserving polygon
  selection. Provincial municipality labels keep their existing click behavior,
  including wrapped `tspan` input. Keyboard access to geographic polygons remains.

No geographic coordinates, SVG polygon paths, PSGCs, source relationships,
submodule pins, map dimensions, navigation routes or administrative exceptions
were changed. The legacy path comparison remains intact; the intentional label
redesign now has separate tests instead of comparing old font sizes/centroids.

## Verification and visual review

- 89 application tests in 14 suites passed, including interior anchors for
  concave polygons, holes and islands; complete name wrapping; deterministic
  collision reduction and coordinate preservation from the cartographic stage.
- TypeScript and production Vite build passed.
- Build verification confirms 118 copied source/config/license assets are
  byte-identical (3,350,388 bytes). This is the previous 117 assets plus Roboto's
  license; the WOFF2 file is bundled separately in `dist/assets/`.
- All five deployment guard tests passed.
- Focused Chromium typography tests passed: all names are retained, visible
  bounding boxes do not overlap or clip horizontally in the tested fitted views,
  Roboto is loaded locally, zoom preserves text size, wrapped labels remain
  clickable and national text passes pointer input to the polygon.
- The tested view/viewport matrix is national (18 labels), Region IX (4),
  Zamboanga del Norte (27), NCR (17) and isolated Dapitan (1), at 1440x900 and
  390x844. Other provinces and arbitrary data overrides are not exhaustively tested.
- Full production-build browser suite: all 84 cases passed in 3.3 minutes.
  Chromium, Firefox and WebKit each passed 25 desktop cases (including the
  1440px/390px typography matrix); emulated Pixel 7, iPhone 13 and iPad each
  passed three touch/layout cases. These are Windows browser/device emulations,
  not physical-device or shipping Safari hardware checks.
- The local preview returned HTTP 200. No production release was performed.

The new screenshot test was synchronized with the existing national/city drawer
opening effect; SVG readiness alone did not guarantee the drawer had opened yet.
No application navigation change was needed for that test timing correction.

Six before/after screenshots per phase are saved under ignored directories:
`react-app/theme-results/typography-before/` and `typography-after/`.
They cover national, region, province, city, zoomed province and mobile province.
The images were visually inspected against the supplied reference. The browser
matrix additionally captures NCR and each tested desktop/narrow view in ignored
`react-app/test-results/`. The review URL is http://127.0.0.1:5173/.

Reproduce from `react-app/` with installed Playwright browser binaries:

```sh
pnpm test
pnpm build
node scripts/verify-build.mjs
node scripts/capture-theme.mjs typography-after
pnpm preview --port 5173 --strictPort
```

Set `PLAYWRIGHT_BROWSERS_PATH` for a nonstandard browser cache. Capture
`typography-before` before rebuilding changed source to establish a new baseline.

## Files for this increment

- `react-app/src/components/GeographicLabels.tsx`: separate memoized label layer.
- `react-app/src/components/MapCanvas.tsx`: counter-scaling and settled zoom state.
- `react-app/src/geography/labels.ts`: interior anchors, wrapping and placement.
- `react-app/src/geography/labels.test.ts`: focused placement/name tests.
- `react-app/src/styles/index.css`: centralized geographic typography tokens.
- `react-app/src/assets/roboto-latin-400.woff2`, `fonts/OFL.txt`: font and license.
- `react-app/tooling/assets.ts`, `react-app/scripts/verify-build.mjs`: license packaging.
- `react-app/tests/browser/typography.spec.ts`: view/viewport/input/font checks.
- `react-app/tests/browser/drilldown.spec.ts`: retain polygon parity comparison.
- `react-app/tests/browser/theme.spec.ts`: keep cartographic color/interaction tests.
- `react-app/tests/browser/svgInput.ts`: native hit testing supports wrapped text.
- `react-app/scripts/capture-theme.mjs`: retain separate typography before/after captures.
- `docs/migration/GEOGRAPHIC-TYPOGRAPHY.md`: this review report.

Cartographic-stage uncommitted files remain as listed in CARTOGRAPHIC-THEME.md.
The initial review was local-only. The subsequent Segoe UI revision was approved
for release on 27 October 2026; deployment status is tracked in Vercel.
