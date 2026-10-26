# Midnight Ocean theme

26 October 2026. React branch: `codex/react-migration-drilldown`.
Baseline before this change: `dfc6478dcbe1b919d3401948afc3c6791d7bfa49`.
Design source: [MAPA-Hayag, frame 1:15](https://www.figma.com/design/ToUmi5Y5FB9olxBGvCcOvU/MAPA-Hayag?node-id=1-15).

## Design mapping

The frame's solid paints were read directly from Figma, including land and
border paints on vector nodes 2:3–2:53. All listed source paints have opacity 1.
The existing React layout, typography and actual geographic paths are retained;
Figma's illustrative island assets and typography were not substituted.

| Semantic CSS/Tailwind token | Exact Figma paint | Use |
| --- | --- | --- |
| `--color-map` | `#0C1B30` | Ocean and page background |
| `--color-panel` | `#0A1322` | Sidebar surface |
| `--color-land` | `#285C58` | Default geographic fill, NCR background |
| `--color-geographic-border` | `#69CFC9` | Geographic boundaries |
| `--color-map-label` | `#F2F7FF` | Geographic labels |
| `--color-text-primary` | `#F0F6FF` | Heading, description, detail values |
| `--color-text-secondary` | `#9AAAC1` | Secondary text and close control |
| `--color-divider` | `#273143` | Sidebar edge and detail separators |

Tokens live in `react-app/src/styles/index.css` in a static Tailwind theme block,
so both utility classes and SVG presentation attributes can reference them.
Controls reuse panel, divider and text tokens. No textures, gradients, glows,
new panels or navigation controls were added.

## Interaction extensions

Hover/keyboard focus uses `#326E69`; selected neutral polygons use `#345F7C`.
These are implementation extensions, not additional paints claimed from Figma.
A light `#F2F7FF` outline reinforces these states, and `aria-pressed` exposes
selection. Native keyboard focus remains visible. Selected state follows the
displayed map: it appears during drilldown, persists at configured maximum depth,
and marks the isolated city. Navigation and parent/history behavior are unchanged.

Geographic labels contrast at 7.07:1 on default land, 5.47:1 on hover and 6.35:1
on selection. The source geographic border exceeds 3:1 on all three neutral
fills. Data-driven choropleth fills remain unchanged during hover and selection;
only their outline changes. These contrast measurements do not certify every
configurable choropleth palette or the entire application's accessibility.

## Verification

- 81 application tests across 12 suites passed.
- TypeScript and Vite production build passed.
- Build verification confirmed 117 copied assets / 3,345,994 bytes match sources.
- Four deployment guard tests passed.
- All 72 browser cases passed against the production build in 2.7 minutes:
  21 each in Chromium, Firefox and WebKit desktop, plus three each in emulated
  Pixel 7, iPhone 13 and iPad projects. These are browser/device emulations on
  Windows, not physical-device or shipping Safari hardware tests.
- Desktop national/selected and mobile province screenshots were visually
  inspected. The local preview returned HTTP 200.

The updated legacy comparison still checks drawer geometry, rendered typography,
SVG paths and label positions. New tests separately assert exact palette values,
real pointer hover, native keyboard focus, selection and preserved choropleth
encoding. Pointer tests hit-test the actual polygon because concave geographic
shapes can have bounding-box centers outside their land area.

The new hover test initially missed a concave polygon, and Firefox required
native Tab navigation to exercise its keyboard-only focus indicator. Both test
input issues were corrected; the final full run has no failures. Screenshots and
the machine-readable result live in ignored `react-app/test-results/` and are
replaced by subsequent test runs.

## Preview and scope

The production-build local preview is available at http://127.0.0.1:5173/ while
the preview server is running. To start it again from `react-app/`, run
`pnpm build` then `pnpm preview --port 5173 --strictPort`.

Source geography, PSGC relationships, root/legacy HTML, attribution, Vercel
configuration and production deployment remain unchanged. Known source-data
limitations and inherited dense-label overlap documented in RESULTS.md remain.
There are no new runtime dependencies. This is a theme change; no new performance
claim or performance benchmark is made.

Changed implementation files: `react-app/src/styles/index.css`,
`react-app/src/app/App.tsx`, `react-app/src/components/DetailsDrawer.tsx`,
`react-app/src/components/MapCanvas.tsx`, `react-app/src/config/colors.ts`.
Changed/added tests: `react-app/src/config/schema.test.ts`,
`react-app/tests/browser/foundation.spec.ts`, `react-app/tests/browser/theme.spec.ts`.
This document records the source mapping and verification.
