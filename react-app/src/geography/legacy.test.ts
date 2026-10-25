// @vitest-environment node
import { readFileSync } from 'node:fs';

it.each(['index.html', 'index-no-nir.html'])('keeps %s legacy behavior intact except for asset location adapters', name => {
  const source = readFileSync(`../${name}`, 'utf8').replace(/\r\n/g, '\n');
  const expected = source
    .replace("d3.json('./data.json')", "d3.json('../data.json')")
    .replaceAll("= './philippines-json-maps'", "= '../philippines-json-maps'")
    .replace("GEO_BASE = config.geoBasePath || './philippines-json-maps';", "GEO_BASE = new URL(config.geoBasePath || './philippines-json-maps', new URL('../', location.href)).href.replace(/\\/$/, '');")
    .replaceAll('./geo-nir/', '../geo-nir/')
    .replaceAll('./huc-boundaries.json', '../huc-boundaries.json');
  expect(readFileSync(`../legacy/${name}`, 'utf8').replace(/\r\n/g, '\n')).toBe(expected);
});
