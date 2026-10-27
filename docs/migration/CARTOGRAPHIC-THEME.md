# Assassin's Creed IV cartographic theme review

27 October 2026. Branch: `codex/react-migration-drilldown`.
Recoverable baseline: `ff8db76da04d8a54308cf63bdf7db0e02669e823`.

The user's supplied screenshots are the primary visual reference. The source
[Assassin's Creed IV style by Sarah Frisk](https://snazzymaps.com/style/72543/assassins-creed-iv)
confirms the water, land and linework paints. Its Google Maps configuration is
not imported; React/D3 continues to render the existing geographic datasets.
This increment is local for review and has not been deployed to production.

The subsequent [geographic typography review](GEOGRAPHIC-TYPOGRAPHY.md) supersedes
this increment's label colors, sizing and placement while retaining its map palette
and boundary treatment. Label contrast figures below describe the earlier labels.

## Centralized palette

All colors live in `react-app/src/styles/index.css` under `@theme static`.
Tailwind utilities and SVG attributes consume the same semantic variables.

| Token | Color | Role |
| --- | --- | --- |
| `--color-map` | `#24282B` | Reference water / page background |
| `--color-land` | `#4D6059` | Reference default land / NCR seam background |
| `--color-geographic-border` | `#7F8D89` | Reference linework, applied to administrative edges |
| `--color-panel` | `#202628` | Complementary sidebar and control surface |
| `--color-map-label`, `--color-text-primary` | `#EEF1E8` | Geographic labels and primary UI text |
| `--color-text-secondary` | `#B4BEB6` | Secondary text / control border |
| `--color-divider` | `#3C4742` | Dividers / control hover |
| `--color-land-hover` | `#55685F` | Muted pointer / keyboard focus fill |
| `--color-land-selected` | `#5C7064` | Muted selected fill |
| `--color-interaction-border` | `#BAC8BD` | Hover, selection and keyboard outline |

Label contrast is 5.87:1 on default land, 5.21:1 on hover and 4.65:1 on selected
land. Interaction outlines exceed 3:1 against all three fills. Source linework
is intentionally understated; these numbers do not certify arbitrary configured
choropleth palettes or the entire application. Choropleth values retain their
existing fills during hover/selection and receive an outline instead.

## Coastlines and administrative linework

- The filled geographic features use the original D3 projection, coordinates,
  path strings, bounds, labels and PSGCs. No smoothing, snapping, simplification,
  coordinate rounding, replacement geography or new geographic requests occur.
- A read-only boundary helper recognizes segments whose exact endpoints occur
  in different features, regardless of winding. Each shared segment appears once
  in a single noninteractive SVG mesh. Holes/coastlines with one owner are not
  added to this shared mesh. An isolated city has no internal mesh.
- Independently simplified neighbors sometimes have different vertices. Their
  original edges retain a 0.25px hairline instead of being removed or repaired.
  The coast therefore reads primarily through flat land/water contrast. Aligned
  edges overpaint at the same location with opaque strokes, without an added
  offset, halo, gap, transparency buildup or doubled stroke width.
- Shared administrative borders are 0.65px for regions, 0.55px for provinces and
  0.45px for municipalities; hover/selection is 0.9px and keyboard focus 1.3px.
  Width tokens are centralized alongside the colors. SVG `non-scaling-stroke`
  keeps all these widths steady during wheel zoom, touch zoom, pan and animated
  drilldown. The existing interaction/transition timing remains.
- Boundary extraction is memoized by the displayed collection and projected
  paths by projection/mesh. Pan and zoom update the parent transform without
  rebuilding the mesh or requesting more geographic files. No dependency was
  added. The React best-practices review retained React ownership of SVG and
  D3 ownership of gesture listeners.

The left drawer, controls, map dimensions/positioning, typography, branding,
NIR/legacy alignment, NCR/HUC ancestry and geographic navigation are preserved.
No roads, textures, gradients, decorative glows, extra panels or toolbars were added.

## Visual evidence and local review

Local review URL: http://127.0.0.1:5173/ (production Vite build, local server).

Six screenshots per phase and rendered SVG properties were captured under
ignored `react-app/theme-results/before/` and `react-app/theme-results/after/`:

- `desktop-national.png`: entire Philippines, 18 regions.
- `desktop-region.png`: Region IX, four provincial/HUC features.
- `desktop-province.png`: Zamboanga del Norte, 27 cities/municipalities.
- `desktop-city.png`: isolated City of Dapitan.
- `desktop-province-zoom.png`: wheel-zoomed provincial coastline/linework.
- `mobile-province.png`: same province at 390x844.

The four geographic levels and zoom/mobile views were visually inspected against
the references. Computed SVG values confirm exact RGB `(36,40,43)` water,
`(77,96,89)` default land and `(127,141,137)` borders. Isolated city selection
uses the documented selected fill and outline. Captures recorded no page errors.

Reproduce from `react-app/` with an installed Playwright Chromium:

```sh
pnpm build
node scripts/capture-theme.mjs after
pnpm preview --port 5173 --strictPort
```

Use `PLAYWRIGHT_BROWSERS_PATH` when browser binaries live outside Playwright's
default cache. For a new baseline, capture `before` before rebuilding changed code;
the current before images were captured from the original baseline build.

## Verification

- Application tests: 85 passed across 13 suites, including four boundary tests
  for deduplication, winding, holes, multipolygons, coordinate preservation,
  mismatched vertices and actual national/provincial/municipal resources.
- TypeScript checks and Vite production build passed.
- All 117 copied assets (3,345,994 bytes) are byte-identical to repository sources.
- All five deployment guard tests passed; deployment settings were not edited.
- Focused Chromium theme tests: four passed, covering palette, real pointer and
  native keyboard input, selection, choropleth fills and all four zoom scales.
- Full production-build regression suite: all 75 cases passed in 2.9 minutes.
  Chromium, Firefox and WebKit each passed 22 desktop cases; emulated Pixel 7,
  iPhone 13 and iPad each passed three mobile cases. Coverage includes exact
  legacy SVG paths/labels and drawer geometry/typography, national→region→province
  →city navigation, NIR/legacy/HUC/NCR handling, history, failures/retry, touch
  panning, orientation changes, narrow controls and the four new theme cases.
- Local preview response: HTTP 200. No production deployment was performed.

## Geographic limitations and later work

The current 0.001-degree simplified geographic resources visibly produce angular
coastlines in close-up city views. Styling cannot recover missing coastal detail.
Neighbors with independently simplified edge vertices can also retain inherited
tiny gaps/misalignment. The helper does not invent connecting boundaries to hide
that source limitation. Existing null/empty geometry and dense label overlap
limitations remain as documented in RESULTS.md and RELEASE-CHECKS.md.

For a separate assignment, review the existing higher-resolution resources with
PSGC/topology verification and request/memory measurements before choosing any
data change. Label collision handling could likewise be evaluated separately.
Physical-device Safari and gesture-feel checks remain useful; browser device
emulation is not physical-device testing.

## Files changed

- `.gitignore`: ignore reproducible visual evidence.
- `react-app/src/styles/index.css`: semantic color and stroke tokens.
- `react-app/src/components/MapCanvas.tsx`: memoized mesh and fixed-width strokes.
- `react-app/src/geography/boundaries.ts`: read-only shared-edge extraction.
- `react-app/src/geography/boundaries.test.ts`: geographic integrity coverage.
- `react-app/tests/browser/theme.spec.ts`: palette, interaction and zoom checks.
- `react-app/tests/browser/foundation.spec.ts`: approved background expectation.
- `react-app/scripts/capture-theme.mjs`: repeatable local visual evidence.
- `docs/migration/CARTOGRAPHIC-THEME.md`: source mapping, behavior and review notes.
