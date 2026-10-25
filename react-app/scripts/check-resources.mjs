import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const index = JSON.parse(await readFile(path.join(root, 'psgc-index.json'), 'utf8'));
const base = 'philippines-json-maps/2023/geojson';
const groups = ['country/lowres', 'regions/lowres', 'provdists/lowres', 'provdists/medres'];
const report = { groups: {}, malformed: [], nullGeometry: [], duplicateIds: [], missing: [] };
for (const group of groups) {
  const directory = path.join(root, base, group);
  const files = await readdir(directory);
  let bytes = 0;
  for (const file of files) {
    const filename = path.join(directory, file);
    bytes += (await stat(filename)).size;
    const data = JSON.parse(await readFile(filename, 'utf8'));
    if (!Array.isArray(data.features)) { report.malformed.push(`${group}/${file}`); continue; }
    const seen = new Set();
    for (const feature of data.features) {
      if (!feature.geometry) report.nullGeometry.push(`${group}/${file}:${feature.properties?.adm3_psgc}`);
      const props = feature.properties;
      const id = props?.adm3_psgc ?? props?.adm2_psgc ?? props?.adm1_psgc;
      if (seen.has(id)) report.duplicateIds.push(`${group}/${file}:${id}`);
      seen.add(id);
    }
  }
  report.groups[group] = { files: files.length, bytes };
}
for (const province of index.provinces) {
  const resolution = province.region_psgc === 1300000000 ? 'medres' : 'lowres';
  const suffix = resolution === 'medres' ? '0.01' : '0.001';
  const relative = `${base}/provdists/${resolution}/municities-provdist-${province.psgc}.${suffix}.json`;
  try { await stat(path.join(root, relative)); } catch { report.missing.push(relative); }
}
console.log(JSON.stringify(report, null, 2));
if (report.missing.length) process.exitCode = 1;
