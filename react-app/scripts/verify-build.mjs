import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(app, '..');
const dist = path.join(app, 'dist');
let copied = 0, bytes = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) { await walk(full); continue; }
    const relative = path.relative(dist, full);
    if (relative === 'index.html' || relative.startsWith('assets' + path.sep)) continue;
    const [source, built] = await Promise.all([readFile(path.join(repo, relative)), readFile(full)]);
    const hash = buffer => createHash('sha256').update(buffer).digest('hex');
    if (hash(source) !== hash(built)) throw new Error(`Changed asset: ${relative}`);
    copied++; bytes += built.length;
  }
}
await walk(dist);
for (const required of ['data.json', 'huc-boundaries.json', 'geo-nir/country.0.001.json', 'philippines-json-maps/LICENSE', 'philippines-json-maps/2023/geojson/provdists/medres/municities-provdist-1303900000.0.01.json']) await readFile(path.join(dist, required));
console.log(`Verified ${copied} copied assets (${bytes} bytes) are byte-identical to repository sources.`);
