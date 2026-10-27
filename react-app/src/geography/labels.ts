import { geoStream, polygonArea, polygonCentroid, polygonContains } from 'd3';
import type { makePath } from './projection';
import type { GeographicFeature } from './types';

type Point = [number, number];
type ProjectedPolygon = Point[][];
export interface LabelSeed {
  code: string;
  name: string;
  anchor: Point;
  polygons: ProjectedPolygon[];
  area: number;
}
export interface PlacedLabel extends LabelSeed {
  lines: string[];
  dx: number;
  dy: number;
  width: number;
  height: number;
}

function contains(polygons: ProjectedPolygon[], point: Point) {
  return polygons.some(([outer, ...holes]) => polygonContains(outer, point) && !holes.some(hole => polygonContains(hole, point)));
}

/** Project existing coordinates only to position text; never change map paths. */
export function labelGeometry(feature: GeographicFeature, path: ReturnType<typeof makePath>) {
  const polygons: ProjectedPolygon[] = [];
  let polygon: ProjectedPolygon, ring: Point[];
  const sink = {
    polygonStart() { polygon = []; polygons.push(polygon); }, polygonEnd() {},
    lineStart() { ring = []; polygon.push(ring); }, lineEnd() {},
    point(x: number, y: number) { ring.push([x, y]); }, sphere() {},
  };
  geoStream(feature, path.projection()!.stream(sink));
  const ordered = [...polygons].sort((a, b) => Math.abs(polygonArea(b[0])) - Math.abs(polygonArea(a[0])));
  const area = ordered.reduce((sum, [outer, ...holes]) => sum + Math.abs(polygonArea(outer)) - holes.reduce((sum, hole) => sum + Math.abs(polygonArea(hole)), 0), 0);
  const centroid = path.centroid(feature) as Point;
  if (centroid.every(Number.isFinite) && contains(polygons, centroid)) return { anchor: centroid, polygons, area };
  const outer = ordered[0]?.[0];
  if (!outer) return undefined;
  const center = polygonCentroid(outer) as Point;
  if (center.every(Number.isFinite) && contains([ordered[0]], center)) return { anchor: center, polygons, area };
  // Concave/island centroids can fall in water. A bounded interior search is
  // sufficient for label anchors and introduces no new geographic coordinates.
  const xs = outer.map(point => point[0]), ys = outer.map(point => point[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let anchor: Point | undefined, best = Infinity;
  for (let row = 0; row < 16; row++) for (let column = 0; column < 16; column++) {
    const point: Point = [x0 + (column + 0.5) / 16 * (x1 - x0), y0 + (row + 0.5) / 16 * (y1 - y0)];
    const distance = (point[0] - (x0 + x1) / 2) ** 2 + (point[1] - (y0 + y1) / 2) ** 2;
    if (distance < best && contains([ordered[0]], point)) { anchor = point; best = distance; }
  }
  // Extremely thin geometry can miss the grid. Its source vertex is preferable
  // to dropping the name; this fallback remains on the supplied polygon edge.
  return { anchor: anchor ?? outer[0], polygons, area };
}

export function wrapLabel(name: string, maxWidth: number, measure: (text: string) => number) {
  const lines: string[] = [];
  for (const word of name.trim().split(/\s+/)) {
    const current = lines.at(-1);
    if (current && measure(current + ' ' + word) <= maxWidth) lines[lines.length - 1] += ' ' + word;
    else lines.push(word);
  }
  return lines;
}

/** Deterministic bounded placement. Keep every name; prefer an interior center,
 * then nearby free space. Re-run after zoom settles, never on each pan frame. */
export function placeLabels(seeds: LabelSeed[], measure: (text: string) => number, maxWidth: number, lineHeight: number, scale = 1, viewportWidth = Infinity): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const boxes: { x: number; y: number; width: number; height: number }[] = [];
  for (const seed of [...seeds].sort((a, b) => b.area - a.area || a.code.localeCompare(b.code))) {
    const lines = wrapLabel(seed.name, maxWidth, measure);
    // SVG text boxes can exceed canvas line metrics (notably Segoe UI in
    // Firefox). Reserve vertical room for font extents and the thin halo.
    const width = Math.max(...lines.map(measure)) + 6, height = lines.length * lineHeight + 8;
    let best = Infinity, chosen = { dx: 0, dy: 0 };
    const steps = [0, 12, 24, 36, 48, 64, 80, 100, 120];
    for (const distance of steps) {
      const offsets = distance === 0 ? [[0, 0]] : [[0, -distance], [0, distance], [-distance, 0], [distance, 0], [-distance, -distance], [distance, -distance], [-distance, distance], [distance, distance]];
      for (const [dx, dy] of offsets) {
        const x = seed.anchor[0] * scale + dx - width / 2, y = seed.anchor[1] * scale + dy - height / 2;
        let overlap = 0;
        for (const box of boxes) overlap += Math.max(0, Math.min(x + width, box.x + box.width) - Math.max(x, box.x)) * Math.max(0, Math.min(y + height, box.y + box.height) - Math.max(y, box.y));
        const interior = contains(seed.polygons, [seed.anchor[0] + dx / scale, seed.anchor[1] + dy / scale]);
        // At the fitted view keep complete names inside the screen. Panned or
        // zoomed views retain geographic movement instead of pinning text to UI.
        const clipped = scale === 1 ? Math.max(0, 4 - x) + Math.max(0, x + width - viewportWidth + 4) : 0;
        const score = clipped * 100000 + overlap * 1000 + (interior ? 0 : 250) + (dx * dx + dy * dy) / 10;
        if (score < best) { best = score; chosen = { dx, dy }; }
      }
      if (best === 0) break;
    }
    placed.push({ ...seed, lines, ...chosen, width, height });
    boxes.push({ x: seed.anchor[0] * scale + chosen.dx - width / 2, y: seed.anchor[1] * scale + chosen.dy - height / 2, width, height });
  }
  return placed;
}
