import { readFileSync } from 'node:fs';
import type { GeographicCollection, GeographicFeature } from './types';
import { administrativeBoundaries } from './boundaries';

const polygon = (coordinates: number[][][]): GeographicFeature => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } });
const collection = (...features: GeographicFeature[]): GeographicCollection => ({ type: 'FeatureCollection', features });

describe('administrative boundary rendering', () => {
  it('draws shared borders once regardless of winding without outlining coastlines', () => {
    const a = polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]);
    const b = polygon([[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]]);
    const source = collection(a, b);
    const before = JSON.stringify(source);
    expect(administrativeBoundaries(source).coordinates).toEqual([[[1, 0], [1, 1]]]);
    expect(JSON.stringify(source)).toBe(before);
    expect(administrativeBoundaries(collection(a)).coordinates).toEqual([]);
  });

  it('does not fabricate borders across tiny gaps or mismatched segmentation', () => {
    const a = polygon([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]);
    const b = polygon([[[1.000001, 0], [2, 0], [2, 1], [1.000001, 1], [1.000001, 0]]]);
    expect(administrativeBoundaries(collection(a, b)).coordinates).toEqual([]);
    const segmented = polygon([[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0.5], [1, 0]]]);
    expect(administrativeBoundaries(collection(a, segmented)).coordinates).toEqual([]);
  });

  it('handles multipolygons, enclosed administrative areas and duplicate rings', () => {
    const hole = [[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]];
    const outer = polygon([[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]], hole]);
    const enclave = polygon([hole]);
    expect(administrativeBoundaries(collection(outer)).coordinates).toEqual([]);
    expect(administrativeBoundaries(collection(outer, enclave)).coordinates).toHaveLength(4);
    const multi: GeographicFeature = { ...enclave, geometry: { type: 'MultiPolygon', coordinates: [[hole], [hole]] } };
    expect(administrativeBoundaries(collection(multi)).coordinates).toEqual([]);
    expect(administrativeBoundaries(collection(outer, multi)).coordinates).toHaveLength(4);
  });

  it('retains exact source endpoints for real national, provincial and municipal borders', () => {
    for (const file of [
      '../geo-nir/country.0.001.json',
      '../philippines-json-maps/2023/geojson/regions/lowres/provdists-region-900000000.0.001.json',
      '../philippines-json-maps/2023/geojson/provdists/lowres/municities-provdist-907200000.0.001.json',
    ]) {
      const source = JSON.parse(readFileSync(file, 'utf8')) as GeographicCollection;
      const before = JSON.stringify(source);
      const mesh = administrativeBoundaries(source);
      expect(mesh.coordinates.length).toBeGreaterThan(0);
      expect(JSON.stringify(source)).toBe(before);
      const points = new Set(source.features.flatMap(feature => {
        const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        return polygons.flatMap(polygon => polygon.flatMap(ring => ring.map(point => JSON.stringify(point))));
      }));
      expect(mesh.coordinates.every(segment => segment.length === 2 && segment.every(point => points.has(JSON.stringify(point))))).toBe(true);
    }
  });
});
