# MAPA-Hayag modernization baseline

Recorded before implementation on 25 October 2026.

- Application commit: `e1ad7e6783956ca96d4158fdb44406d06dd16caf`.
- Initial working tree: clean; `main` matched the locally recorded `origin/main`.
- Geographic gitlink: `8eeead560246863c8c820c31ca6fbca81a279477`.
- Geographic submodule: uninitialized at the beginning of this task.
- Production entry points: root `index.html` (NIR) and `index-no-nir.html` (17-region alignment).
- Production configuration: root `data.json`. Existing deployment/domain settings are out of scope.

## Visual contract

Preserve the exact title `MAPAhayag project`, dark background `#1a1a2e`, panel `#12121f`, left sliding drawer (360px maximum, 100% on smaller screens), upper-left hamburger while the drawer is closed, upper-right Back control, bottom-left status, existing monospace labels and typography. Desktop starts with the welcome drawer open; coarse-pointer devices start closed. Dark mode is permanent: no light-mode switch or stored theme override. The latest UI approval supersedes the older migration checklist item about theme switching.

## Behavioral contract

National → region → province/district → municipality/city. NCR skips district presentation and combines four medium-resolution district files. National and VI/VII/XVIII overrides implement NIR; the other entry point uses the 17-region data. Supplementary city polygons are grouped by geographic parent province. `maxDepth`, configured metrics and detail fields remain supported. Pan/zoom range is 0.5–20; labels, panel text, and hash routes remain compatible. No barangay paths are used.

## Known defects to characterize, not reproduce in React

- Municipality restoration is shadowed by the broader province route branch.
- Render-closure stack and browser history can diverge; restoration adds stack entries.
- Class-level CSS fill overrides choropleth presentation attributes.
- Detail values/labels and welcome description are interpolated through `innerHTML`.
- Lower-level NIR geometry retains legacy codes/ancestry; Bacolod's supplementary feature has Region VI ancestry. Preserve source codes and apply an explicit view-alignment policy.
- Viewport sizing is captured once; no resize listener exists.
- Example records contain unmatched codes and a Central Luzon code labeled as Ilocos.
- The geographic index is 2023-derived with selective NIR changes, not a current authoritative administrative register.

These observations come from the root HTML scripts, `data.example.json`, generation scripts, and bundled JSON. Browser characterization and resource coverage results will be recorded in RESULTS.md. A successful bundle build alone does not establish full functional parity.

## Scope of this increment

Keep root application files intact. Add runnable copies under `legacy/` with only relative asset resolution adjusted. Create an isolated Vite project under `react-app/` so the production entry point and root build detection are not replaced. Establish typed validated configuration, geographic validation/loading/cache/alignment, route primitives, React shell and safe text-only panel rendering. Full map interaction parity and production cutover remain later stages.
