import { parseGeography } from './validate';

const closedRing = [[120, 10], [121, 10], [121, 11], [120, 10]];
function collection(geometry: unknown, properties: unknown = { adm1_psgc: 700000000, adm1_en: 'Region VII' }) {
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties, geometry }] };
}

it('retains every source coordinate and does not mutate or clone geometry', () => {
  const geometry = { type: 'MultiPolygon', coordinates: [[closedRing]], bbox: [120, 10, 121, 11] };
  const snapshot = JSON.stringify(geometry);
  const parsed = parseGeography(collection(geometry), 'region');
  expect(parsed.collection.features[0].geometry).toBe(geometry);
  expect(JSON.stringify(geometry)).toBe(snapshot);
});

it.each([
  { type: 'GeometryCollection', geometries: [] },
  { type: 'Point', coordinates: [120, 10] },
  { type: 'Polygon', coordinates: [] },
  { type: 'MultiPolygon', coordinates: [] },
  { type: 'MultiPolygon', coordinates: [[]] },
  { type: 'Polygon', coordinates: [closedRing.slice(0, 3)] },
  { type: 'Polygon', coordinates: [[[120, 10], [121, 10], [121, 11], [122, 10]]] },
  { type: 'Polygon', coordinates: [[[120, 10], [181, 10], [121, 11], [120, 10]]] },
  { type: 'Polygon', coordinates: [[[120, 10], [121, 91], [121, 11], [120, 10]]] },
  { type: 'Polygon', coordinates: [[[120, 10], ['121', 10], [121, 11], [120, 10]]] },
  { type: 'Polygon', coordinates: [[[120, 10], [121, NaN], [121, 11], [120, 10]]] },
  { type: 'Polygon', coordinates: [[[120, 10], [121, 10, Infinity], [121, 11], [120, 10]]] },
  { type: 'Polygon', coordinates: [closedRing, []] },
  undefined,
])('rejects malformed geometry %#', geometry => {
  expect(() => parseGeography(collection(geometry), 'region')).toThrow();
});

it('validates holes, every multipolygon member and additional coordinate dimensions', () => {
  expect(() => parseGeography(collection({ type: 'Polygon', coordinates: [closedRing, closedRing] }), 'region')).not.toThrow();
  expect(() => parseGeography(collection({ type: 'MultiPolygon', coordinates: [[closedRing], [[]]] }), 'region')).toThrow();
  expect(() => parseGeography(collection({ type: 'Polygon', coordinates: [closedRing.map(point => [...point, 3])] }), 'region')).not.toThrow();
});

it.each([
  { adm1_psgc: 0, adm1_en: 'Region' },
  { adm1_psgc: 'not-a-code', adm1_en: 'Region' },
  { adm1_psgc: 1, adm1_en: '' },
  { adm1_psgc: 1 },
])('still validates source PSGC and name %#', properties => {
  expect(() => parseGeography(collection({ type: 'Polygon', coordinates: [closedRing] }, properties), 'region')).toThrow();
});
