# Regional profiles — local review, 29 October 2026

Baseline: `2d2f625595603334a88e134736c6e0cbc5cd3853`, branch `codex/react-migration-drilldown`, clean tree before this increment. This extends the earlier two-profile pilot to all 18 displayed regions. No commit, push or deployment is part of this work.

## Content and provenance

Each region has population, province/city/municipality/barangay counts, its stable ten-digit PSGC, land area, population density, the same three named prose sections, sources and dated caveats. The country profile remains available. Province/city selections retain their configured record/no-data behavior rather than inheriting a regional profile.

The 17 new profiles are stored in `react-app/src/data/regional-profiles.json`; supporting sources are in `regional-sources.json`. These are validated and combined with the existing pilot data by `src/profiles/catalog.ts`. Each statistic and paragraph retains its own source IDs. No React component or stylesheet change was necessary.

Quantitative verification:

- Population was checked on each [PSA regional PSGC page](https://psa.gov.ph/classification/psgc/provinces/0100000000) (replace the final code with that region's PSGC), and corroborated against Table 3 of the revised density release. Reference: **1 July 2024 census**, not a real-time estimate.
- Administrative counts were checked against the [PSA summary as of 30 September 2026](https://psa.gov.ph/classification/psgc/summary). Regional pages have older composition captions, so those captions are not used as the count reference date.
- Area and density come from [PSA's revised density release, 6 July 2026, Table 3](https://psa.gov.ph/system/files/phcd/PD_Press%20Release_%2004-08-26_0.pdf). Area uses the 2019 LMB masterlist and MENRE's SGA reference; density is the published whole-number value. No SVG-area measurement or new density calculation was introduced. Regional areas do not sum to the approximate national area.
- The revised PDF gives CALABARZON density as **1,095**, whereas the older HTML page still says 1,102. This expansion uses the revised PDF, whose population and area are compatible.
- The same revised table verifies Region IX area **18,291.44 km²** and density **278 people/km²**, for coverage including Sulu. Those previously unavailable pilot fields are now populated and retain the boundary notice.

Background verification uses government regional profiles, agency releases and cultural documentation from CDA, DENR, NNC, DEPDev, DOST, DA, NCCA, the National Museum, regional/local governments and official information services. Older background statistics, rankings, projections, ethnographic population counts and city classifications are not reused. Prose uses concise, specific examples rather than claims to describe every community. Some sections emphasize administration rather than asserting an unverified founding date.

Access limitations: some official NNC, TPB, EMB, DEPDev and Bangsamoro pages blocked direct automated retrieval (403/robots/temporary server errors). Their accessible indexed official text supplied the cited limited background statements. A search-index check is not a fresh direct page download; the catalog does not claim a known publication date where none was established. All numeric headline values were verified through directly retrievable PSA pages/PDF. Users may encounter restrictions on external source sites. Source links are not fetched at runtime, so restrictions do not prevent the profiles from loading locally.

## Geographic alignment

- NIR, Western Visayas and Central Visayas use the post-RA 12000 statistical grouping. Their notices explain the different legacy-mode polygons and retain all original PSGCs.
- BARMM statistics exclude Sulu; its older polygons still include Sulu. The notice also distinguishes older Maguindanao/SGA representations. The published regional total is used, not a new sum of current provincial subtotals.
- NCR's notice identifies the Makati–Taguig transfer of ten barangays, documented in the PSA third-quarter 2023 update. No city polygon is changed.
- Region IX's existing Sulu notice remains. SOCCSKSARGEN's prose warns that older background pages place Cotabato City in Region XII, whereas the current PSA grouping places it in BARMM.

## Local review

The production build is served locally at `http://127.0.0.1:5173/?review=all-regions#/`. Click a region or use:

- NIR: `http://127.0.0.1:5173/?review=all-regions#/region/1800000000`
- Western Visayas: `http://127.0.0.1:5173/?review=all-regions#/region/600000000`
- NCR: `http://127.0.0.1:5173/?review=all-regions#/region/1300000000`
- BARMM: `http://127.0.0.1:5173/?review=all-regions#/region/1900000000`
- Legacy comparison: `http://127.0.0.1:5173/?alignment=legacy#/region/600000000`

On touch devices open the hamburger menu. The fixed header, close control and independently scrolling body retain the existing behavior. Close the full-width drawer to access the parent Back control on a narrow screen.

To restart, from `react-app/` run `pnpm build` followed by `pnpm preview --port 5173 --strictPort`; use `pnpm dev` for source editing.

## Files

New: `src/data/regional-profiles.json`, `src/data/regional-sources.json`, `tests/browser/all-regions.spec.ts`, this report.

Modified within `react-app/`: `src/data/geographic-profiles.json` (verified Region IX area/density), `src/profiles/catalog.ts`, `src/profiles/schema.test.ts`, `src/components/GeographicProfile.test.tsx`, `tests/browser/profiles.spec.ts`, `tests/browser/mobile.spec.ts`, `tests/browser/foundation.spec.ts`, `README.md`.

The new all-regions browser tests cover every region's deep link, reload, dated metrics, section presence, return to national and legacy Visayas notices. Existing tests retain city/province fallback, history, retry, interruption, safe text, theme, geography equivalence and mobile scrolling coverage.

## Validation

Completed checks:

- `pnpm test`: 106 passed in 16 files.
- `pnpm build`: TypeScript and Vite production build passed. Final JS 516.29 kB / 147.76 kB gzip; CSS 18.15 kB / 4.69 kB gzip. The CSS bundle hash is unchanged from the approved pilot.
- `node scripts/verify-build.mjs`: all 117 copied assets (3,345,994 bytes) are byte-identical to repository sources.
- `MAPAHAYAG_CROSS_BROWSER=1 node scripts/browser-tests.mjs --workers=2`: 154 passed initially. Three failures came from an old test's unqualified `complementary` selector matching both the sidebar and the newly present NIR notice; the selector now uses the existing accessible sidebar name. Two Firefox tests timed out during one host/server-start interruption. `--last-failed --workers=1` reran all five, and all five passed. Thus all 159 browser checks passed across the run and explicit reruns; this is not a claim of a single uninterrupted 159-pass run.
- Browser coverage: Chromium/Firefox/WebKit desktops, emulated Android/iPhone/iPad, 18 regional deep links and reloads, history, city/province fallback, NIR/legacy/NCR drilldown, source references, independent scrolling and existing geometry/interaction comparisons.
- `git diff --check`: passed. No differences in geographic assets/submodule pin, root HTML, `data.json`, `vercel.json` or theme stylesheet. Nothing committed, pushed or deployed.

Physical-device touch/Safari and manual screen-reader testing are outside the automated emulation coverage. BARMM desktop rendering was visually inspected with its notice and unchanged map; earlier mobile/profile checks exercise the same reusable component. Some background source links require manual access because of the restrictions noted above.

Build output currently produces a Vite advisory because the main minified JS bundle exceeds 500 kB (about 148 kB gzip); the regional data adds about 10 kB gzip over the pilot. The static catalog adds no network waterfall or new runtime data requests. No performance improvement is claimed, and no warning threshold was raised to hide the advisory.

## Regional fact sheet

Population reference is 1 July 2024; counts are 30 September 2026. Area/density follow the revised PSA Table 3 as documented above. Counts are province / city / municipality / barangay. The links lead to each region's official PSA composition and population page.

| Region | PSGC | Population | Counts | Area km² | People/km² |
| --- | --- | ---: | --- | ---: | ---: |
| [Region IX (Zamboanga Peninsula)](https://psa.gov.ph/classification/psgc/provinces/0900000000) | 0900000000 | 5089934 | 4 / 5 / 86 / 2314 | 18291.44 | 278 |
| [Region I (Ilocos Region)](https://psa.gov.ph/classification/psgc/provinces/0100000000) | 0100000000 | 5342453 | 4 / 9 / 116 / 3267 | 12830.62 | 416 |
| [Region II (Cagayan Valley)](https://psa.gov.ph/classification/psgc/provinces/0200000000) | 0200000000 | 3777608 | 5 / 4 / 89 / 2311 | 30986.61 | 122 |
| [Region III (Central Luzon)](https://psa.gov.ph/classification/psgc/provinces/0300000000) | 0300000000 | 12989074 | 7 / 15 / 115 / 3105 | 22648.03 | 574 |
| [Region IV-A (CALABARZON)](https://psa.gov.ph/classification/psgc/provinces/0400000000) | 0400000000 | 16933234 | 5 / 22 / 120 / 3992 | 15470.23 | 1095 |
| [Region V (Bicol Region)](https://psa.gov.ph/classification/psgc/provinces/0500000000) | 0500000000 | 6064426 | 6 / 7 / 107 / 3471 | 18007.22 | 337 |
| [Region VI (Western Visayas)](https://psa.gov.ph/classification/psgc/provinces/0600000000) | 0600000000 | 4861911 | 5 / 3 / 98 / 3389 | 12641.59 | 385 |
| [Region VII (Central Visayas)](https://psa.gov.ph/classification/psgc/provinces/0700000000) | 0700000000 | 6640875 | 2 / 10 / 91 / 2312 | 8975.04 | 740 |
| [Region VIII (Eastern Visayas)](https://psa.gov.ph/classification/psgc/provinces/0800000000) | 0800000000 | 4625929 | 6 / 7 / 136 / 4365 | 21017.38 | 220 |
| [Region X (Northern Mindanao)](https://psa.gov.ph/classification/psgc/provinces/1000000000) | 1000000000 | 5178326 | 5 / 9 / 84 / 2022 | 18622.74 | 278 |
| [Region XI (Davao Region)](https://psa.gov.ph/classification/psgc/provinces/1100000000) | 1100000000 | 5389422 | 5 / 6 / 43 / 1162 | 21733.04 | 248 |
| [Region XII (SOCCSKSARGEN)](https://psa.gov.ph/classification/psgc/provinces/1200000000) | 1200000000 | 4462776 | 4 / 4 / 45 / 1097 | 20262.71 | 220 |
| [National Capital Region (NCR)](https://psa.gov.ph/classification/psgc/provinces/1300000000) | 1300000000 | 14001751 | 0 / 16 / 1 / 1715 | 620.61 | 22561 |
| [Cordillera Administrative Region (CAR)](https://psa.gov.ph/classification/psgc/provinces/1400000000) | 1400000000 | 1808985 | 6 / 2 / 75 / 1178 | 21116.05 | 86 |
| [Region XIII (Caraga)](https://psa.gov.ph/classification/psgc/provinces/1600000000) | 1600000000 | 2865196 | 5 / 6 / 67 / 1312 | 21820.2 | 131 |
| [MIMAROPA Region](https://psa.gov.ph/classification/psgc/provinces/1700000000) | 1700000000 | 3245446 | 5 / 2 / 71 / 1460 | 29063.47 | 112 |
| [Negros Island Region (NIR)](https://psa.gov.ph/classification/psgc/provinces/1800000000) | 1800000000 | 4904944 | 3 / 19 / 44 / 1353 | 13553.48 | 362 |
| [Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)](https://psa.gov.ph/classification/psgc/provinces/1900000000) | 1900000000 | 4545486 | 5 / 3 / 105 / 2185 | 14478.08 | 314 |
