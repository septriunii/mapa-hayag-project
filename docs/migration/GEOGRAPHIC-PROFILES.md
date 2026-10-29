# Geographic profiles pilot

Implementation baseline: `35afad6e45cbec1e518466a9c7e092d0881342cd` on `codex/react-migration-drilldown`. The tree was clean before this work. This pilot is local only; no push, merge, deployment, domain or Vercel configuration change is authorized by its brief.

## Verified content and corrections

Sources were inspected on 27 October 2026. The source catalog preserves official URLs, publisher, publication dates where known, check date and coverage notes. A null publication date means it was not established, not that the reference date is unknown.

| Item | Pilot value and reference | Primary evidence / distinction |
| --- | --- | --- |
| Philippines population | 112,729,484, 1 July 2024 census | [PSA official population release](https://psa.gov.ph/content/2024-census-population-popcen-population-counts-declared-official-president), published 17 July 2025. Not a current population estimate. |
| National area / density | Approximately 300,000 km²; 376 persons/km² | [PSA density release](https://psa.gov.ph/statistics/population-and-housing/node/1684081344), published 17 December 2025. Uses 112,727,776 residents, excluding 1,708 Filipinos in diplomatic missions abroad. These are published PSA figures; no area or density is inferred from map geometry. |
| National administrative counts | 18 region-level groupings; 82 provinces; 149 cities; 1,493 municipalities; 42,010 barangays | [PSA summary as of 30 September 2026](https://psa.gov.ph/classification/psgc/summary), released 12 October 2026. The 18 headings are counted in that summary. Barangays are a statistical count, not a new map level. |
| Region IX population | 5,089,934, census reference 1 July 2024, regrouped to include Sulu | [Current PSA Region IX PSGC profile](https://psa.gov.ph/classification/psgc/provinces/0900000000). Do not attribute this total solely to the older regional census release. |
| Region IX administrative counts | 4 provinces; 5 cities; 86 municipalities; 2,314 barangays; PSGC 0900000000 | Same current region page, corroborated by the dated national PSGC summary above. |
| Historical Region IX population | 3,943,837, same census date, older grouping | [Original PSA regional release](https://psa.gov.ph/system/files/phcd/2024%20POPCEN%20Press%20Release_Region%20IX_ONS-signed.pdf), published 1 August 2025. Explain geographic coverage rather than treating either total as a live estimate. |
| Sulu transfer | EO 91, 30 July 2025, declares Sulu part of Region IX | [Supreme Court E-Library text](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/5/99470). The earlier Supreme Court ruling excluded Sulu from BARMM; the executive order made the Region IX declaration. |
| Historical regional organization | EO 36, 19 September 2001 | [Senate legislative reference](https://issuances-library.senate.gov.ph/executive-issuance/executive-order-no-36-s-2001). Describes the older three-province/five-city organization. |

The brief's headline counts were supported, with these qualifications:

- The proposed 33 HUC / 5 ICC / 111 component-city breakdown was not independently established in this check, so only the verified total of 149 cities is included.
- Region IX area and density remain **Data unavailable**: compatible figures for the expanded region were not verified. No estimate is calculated.
- The displayed Region IX geometry still covers the older three Zamboanga provinces and supplementary Isabela feature. It excludes Sulu. The notice before the regional statistics explicitly separates contemporary administrative statistics from those polygons.
- National descriptive text was edited to source-supported geography, climate, history, economy and language statements. References include the Philippine Embassy in New Zealand, PIA and PAGASA; no new hazard estimates are added.
- Regional economic examples use PSA's June 2025 Quickstat, expressly identified as pre-transfer context rather than an expanded-region economic total. Cultural examples use NCCA and KWF; dated ethnic or speaker population estimates on those pages are not reused.
- Some regional planning URLs were inaccessible or stale. They are not cited as verified sources. No scraped data is fetched at application runtime.

## Model and rendering

- `react-app/src/data/geographic-profiles.json`: exactly two profiles, keyed `national` and `region:0900000000`.
- `react-app/src/data/geographic-sources.json`: shared source records with stable IDs.
- `react-app/src/profiles/schema.ts`: Zod validation and TypeScript types. Each statistic has ID, label, value, optional unit, reference date, source IDs, availability status, optional approximation flag and explanation. Missing/unverified values must be null and explained; verified values need a date and source. Duplicate keys/metric IDs, missing named sections, unknown sources and non-HTTPS/credential-bearing URLs are rejected.
- `react-app/src/profiles/catalog.ts`: validates local imports once and selects a key by actual selection level/PSGC. Padding is only for the profile key/display; geographic source codes are unchanged.
- `react-app/src/components/GeographicProfile.tsx`: reusable plain-text React rendering of the two-column statistics, notices, three sections and source notes. All external source links use HTTPS, a separate tab and `noopener noreferrer`; no hash anchor competes with map routing.
- `react-app/src/components/DetailsDrawer.tsx`: preserves the existing shell/header/close behavior, independently scrolls the body and resets its scroll position on location changes. Existing configured record fields remain visible. Invalid profile catalog data produces a nonfatal notice plus existing location details.
- `react-app/src/navigation/view.ts`: adds selection level and PSGC metadata, including capped-depth selections; no hierarchy calculation changes.
- `react-app/src/app/App.tsx`: selects the profile only for a ready location and suppresses old sidebar content during loading/errors. Other regions/provinces/cities retain existing record/no-data behavior.

The catalog is bundled with the application: there is no new API, database, runtime fetch, network cache or geometry dependency. Validation failure disables the profile catalog as a whole and keeps the map functional. Future editing should validate the catalog before publishing.

The sidebar uses existing semantic colors and Segoe UI. No global theme, map dimensions, projection, SVG geometry, label placement, region mapping, geographic asset, submodule pin or production entry point is changed.

## Local review

From `react-app/`, run `pnpm install --frozen-lockfile` if dependencies are absent, then `pnpm dev`. Visit:

- `http://127.0.0.1:5173/#/` — national profile.
- `http://127.0.0.1:5173/#/region/900000000` — Region IX (the padded code in source data remains `0900000000`).
- `http://127.0.0.1:5173/#/region/1300000000` — unchanged NCR fallback.

On a coarse-pointer screen, use the existing hamburger to open the profile. Scroll the body; the fixed header/close stays available. Close the drawer to reach the existing parent Back control when the narrow drawer covers it. Source links open externally without changing the map route.

## Template for a subsequent region (proposal only)

Add a source record for each official reference first, then one profile record following this outline. Replace placeholders only after confirming the selected region's stable 10-digit PSGC, dates and geographic coverage. Do not add a profile to another level merely because it has this region as its parent.

```json
{
  "key": "region:<10-digit PSGC>", "level": "region", "psgc": "<10-digit PSGC>",
  "name": "<official name>", "levelLabel": "Region", "subtitle": "Philippines",
  "coverage": "<composition and geographic vintage>", "checkedDate": "YYYY-MM-DD",
  "metrics": [
    { "id": "population", "label": "Population", "value": null,
      "unit": "people", "status": "unverified", "referenceDate": null,
      "sourceIds": [], "note": "Pending compatible official-source verification." }
  ],
  "notices": [],
  "sections": [
    { "title": "Geography and Location", "paragraphs": [{ "text": "<verified prose>", "sourceIds": ["<source ID>"] }] },
    { "title": "History and Administration", "paragraphs": [{ "text": "<verified prose>", "sourceIds": ["<source ID>"] }] },
    { "title": "Economy and Culture", "paragraphs": [{ "text": "<verified prose>", "sourceIds": ["<source ID>"] }] }
  ],
  "notes": [{ "text": "<dates, coverage and limitations>", "sourceIds": ["<source ID>"] }]
}
```

This is an editorial template, not executable pilot data. No additional region profiles were implemented. To mark a statistic verified, supply its numeric/string value, date, and verified source ID together; retain explicit boundary notices wherever geography differs.

## Verification

Completed locally on 27 October 2026 against the production Vite build:

| Command (from `react-app/`) | Result |
| --- | --- |
| `pnpm test` | 105 tests passed in 16 files, including schema, safe rendering, profile fallback and navigation tests. |
| `pnpm build` | TypeScript check and Vite production build passed; JS 433.35 kB / 137.63 kB gzip, CSS 18.15 kB / 4.69 kB gzip. Bundle sizes are outputs, not a measured speed improvement. |
| `node scripts/verify-build.mjs` | All 117 copied assets (3,345,994 bytes) matched source SHA-256 hashes. |
| `node --test scripts/check-preview-target.test.mjs` | 5 deployment-target guard tests passed; no deployment was performed. |
| `MAPAHAYAG_CROSS_BROWSER=1 node scripts/browser-tests.mjs --workers=2` | 99 tests passed in 2.3 minutes: Chromium, Firefox and WebKit desktop; emulated Pixel 7, iPhone 13 and iPad. |
| `git diff --check` | Passed. |

PowerShell browser reproduction (set the browser path to your installed Playwright binaries):

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\ANTON FOLDERS\LAB\Projects\mapahayag-project\.playwright-browsers'
$env:MAPAHAYAG_CROSS_BROWSER = '1'
node scripts/browser-tests.mjs --workers=2
```

This machine invoked pnpm through its bundled `pnpm.cjs` with Node because pnpm is not directly on PATH. No dependency versions or lockfile changed.

The first full browser run had 95 passes and four timing failures: mobile assertions measured the drawer during its opening transition, and an existing Firefox theme test checked a city drawer before its opening effect. The tests now wait for the final transform/city opening before measurement. No animation duration or map behavior was changed to accommodate tests. The complete rerun passed all 99 checks.

Browser coverage includes national initialization, Region IX polygon/keyboard selection, padded deep links and reloads, browser Back/Forward, exact-level fallback, maximum-depth configuration, preserved configured records, source URLs/security attributes, scroll reset, loading interruption, HTTP 503/retry, narrow 320px scrolling, theme/contrast, NIR/legacy/NCR, zoom/pan and exact legacy SVG paths. Source link destinations were researched separately; browser checks validate rendered URL/security attributes rather than requiring every third-party site to load during testing.

Visually inspected the settled national and Region IX desktop screenshots, plus the narrow iPhone profile top and scrolled source list. Screenshots live in ignored `react-app/test-results/` outputs:

- `profiles-pilot-profiles-fo-9b376-and-exact-geographic-levels-chromium-desktop/profile-national.png`
- `profiles-pilot-profiles-fo-9b376-and-exact-geographic-levels-chromium-desktop/profile-region-ix.png`
- `profiles-source-links-are--7fd08-ng-preserves-header-and-map-chromium-desktop/profile-region-sources.png`
- `mobile-pilot-profile-scrol-936a1-nt-navigation-remain-usable-iphone-webkit/profile-narrow-top.png`
- `mobile-pilot-profile-scrol-936a1-nt-navigation-remain-usable-iphone-webkit/profile-narrow-sources.png`

The preview at port 5173 serves the current `react-app/dist` build. Browser opening was requested in Codex; if its tab is not visible, use the local links above.

Repository comparison confirmed no differences from HEAD in `geo-nir/`, `philippines-json-maps`, `.gitmodules`, `huc-boundaries.json`, both root HTML files, `data.json` or `vercel.json`. The submodule working tree is clean at the unchanged `8eeead560246863c8c820c31ca6fbca81a279477` pin. No commit was created by this pilot.

Limitations: physical-device Safari/touch behavior and screen-reader behavior were not manually tested; mobile coverage is emulated. No new performance benchmark or production verification was claimed. Compatible current Region IX area/density and the detailed national city-class breakdown remain unverified/withheld as described above. The older regional status counter labels its four displayed features as “provinces,” including the supplementary Isabela feature; this existing map wording was not changed by the profile pilot, whose boundary notice describes the actual older grouping explicitly.

## Changed files

Created:

- `react-app/src/data/geographic-profiles.json`
- `react-app/src/data/geographic-sources.json`
- `react-app/src/profiles/schema.ts`
- `react-app/src/profiles/catalog.ts`
- `react-app/src/profiles/schema.test.ts`
- `react-app/src/components/GeographicProfile.tsx`
- `react-app/src/components/GeographicProfile.test.tsx`
- `react-app/tests/browser/profiles.spec.ts`
- `docs/migration/GEOGRAPHIC-PROFILES.md`

Modified:

- `react-app/src/app/App.tsx`
- `react-app/src/components/DetailsDrawer.tsx`
- `react-app/src/navigation/view.ts`
- `react-app/tests/browser/foundation.spec.ts` (scope existing typography selector to the welcome description)
- `react-app/tests/browser/theme.spec.ts` (same selector plus city drawer readiness)
- `react-app/tests/browser/mobile.spec.ts`
- `react-app/README.md` (pilot documentation link)
