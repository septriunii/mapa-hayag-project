import { polygonContains } from 'd3';
import { labelGeometry, placeLabels, wrapLabel, type LabelSeed } from './labels';
import { makePath } from './projection';
import type { GeographicFeature } from './types';

const path = makePath(600, 600, { lonMin: 0, lonMax: 10, latMin: 0, latMax: 10 });
const feature = (coordinates: number[][][]): GeographicFeature => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } });

describe('geographic label placement', () => {
  it('finds land for a concave administrative area whose centroid falls outside', () => {
    const source = feature([[[1, 1], [5, 1], [5, 5], [4, 5], [4, 2], [2, 2], [2, 5], [1, 5], [1, 1]]]);
    const before = JSON.stringify(source);
    const label = labelGeometry(source, path)!;
    expect(polygonContains(label.polygons[0][0], label.anchor)).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('avoids a water hole and chooses an actual island for a multipart area', () => {
    const lake = feature([[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]], [[2, 2], [2, 4], [4, 4], [4, 2], [2, 2]]]);
    const label = labelGeometry(lake, path)!;
    expect(polygonContains(label.polygons[0][0], label.anchor)).toBe(true);
    expect(polygonContains(label.polygons[0][1], label.anchor)).toBe(false);
    const islands: GeographicFeature = { ...lake, geometry: { type: 'MultiPolygon', coordinates: [
      [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      [[[8, 8], [9, 8], [9, 9], [8, 9], [8, 8]]],
    ] } };
    const islandLabel = labelGeometry(islands, path)!;
    expect(islandLabel.polygons.some(([ring]) => polygonContains(ring, islandLabel.anchor))).toBe(true);
  });

  it('wraps complete source names without ellipses or invented abbreviations', () => {
    const name = 'City of Isabela (Not a Province)';
    const lines = wrapLabel(name, 80, text => text.length * 6);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(name);
  });

  it('reduces dense collisions without dropping names and remains deterministic at zoom scales', () => {
    const seeds: LabelSeed[] = Array.from({ length: 17 }, (_, index) => ({ code: String(index), name: `City ${index}`,
      anchor: [100 + index % 3 * 6, 100 + Math.floor(index / 3) * 6], area: 1,
      polygons: [[[[0, 0], [300, 0], [300, 300], [0, 300], [0, 0]]]],
    }));
    for (const scale of [0.5, 1, 5, 20]) {
      const placed = placeLabels(seeds, text => text.length * 6, 100, 13, scale);
      expect(placed).toHaveLength(seeds.length);
      expect(placed).toEqual(placeLabels(seeds, text => text.length * 6, 100, 13, scale));
      for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) {
        const first = placed[a], second = placed[b];
        const xDistance = Math.abs((first.anchor[0] - second.anchor[0]) * scale + first.dx - second.dx);
        const yDistance = Math.abs((first.anchor[1] - second.anchor[1]) * scale + first.dy - second.dy);
        expect(xDistance >= (first.width + second.width) / 2 || yDistance >= (first.height + second.height) / 2).toBe(true);
      }
    }
  });
});
