import type { MultiLineString, Position } from 'geojson';
import type { GeographicCollection } from './types';

/** Read-only shared-edge mesh. Only exact source segments owned by different
 * features are included, once. Coastlines/holes have a single owner and remain
 * unoutlined; no snapping, rounding, interpolation or topology repair is done. */
export function administrativeBoundaries(collection: GeographicCollection): MultiLineString {
  const edges = new Map<string, { owner: number; segment: Position[]; shared: boolean }>();
  collection.features.forEach((feature, owner) => {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) {
      for (let index = 1; index < ring.length; index++) {
        const a = ring[index - 1], b = ring[index];
        const start = `${a[0]},${a[1]}`, end = `${b[0]},${b[1]}`;
        if (start === end) continue;
        const key = start < end ? `${start}|${end}` : `${end}|${start}`;
        const edge = edges.get(key);
        if (edge) edge.shared ||= edge.owner !== owner;
        else edges.set(key, { owner, segment: [a, b], shared: false });
      }
    }
  });
  return { type: 'MultiLineString', coordinates: [...edges.values()].filter(edge => edge.shared).map(edge => edge.segment) };
}
