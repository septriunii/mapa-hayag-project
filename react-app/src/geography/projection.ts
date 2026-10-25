import { geoPath, geoTransform } from 'd3';
import type { GeographicFeature } from './types';

export const NATIONAL_BOUNDS = { lonMin: 116.93, lonMax: 126.60, latMin: 4.64, latMax: 20.84 };
export type Bounds = typeof NATIONAL_BOUNDS;

export function paddedBounds(features: GeographicFeature[], isolated = false): Bounds {
  const bounds = boundsFromFeatures(features);
  const lonPad = Math.max((bounds.lonMax - bounds.lonMin) * (isolated ? 0.25 : 0.08), isolated ? 0.02 : 0);
  const latPad = Math.max((bounds.latMax - bounds.latMin) * (isolated ? 0.25 : 0.08), isolated ? 0.02 : 0);
  return { lonMin: bounds.lonMin - lonPad, lonMax: bounds.lonMax + lonPad, latMin: bounds.latMin - latPad, latMax: bounds.latMax + latPad };
}

export function boundsFromFeatures(features: GeographicFeature[]): Bounds {
  let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
  for (const feature of features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) for (const ring of polygon) for (const [lon, lat] of ring) {
      lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
      latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
    }
  }
  if (![lonMin, lonMax, latMin, latMax].every(Number.isFinite)) throw new Error('Cannot fit empty geometry');
  return { lonMin, lonMax, latMin, latMax };
}

/** Preserve the baseline linear lon/lat projection; no boundary/reprojection change. */
export function makePath(width: number, height: number, bounds = NATIONAL_BOUNDS) {
  const { lonMin, lonMax, latMin, latMax } = bounds;
  const lonSpan = Math.max(lonMax - lonMin, 0.00001), latSpan = Math.max(latMax - latMin, 0.00001);
  const scale = Math.min(Math.max(width - 60, 1) / lonSpan, Math.max(height - 60, 1) / latSpan);
  const offX = (width - lonSpan * scale) / 2, offY = (height - latSpan * scale) / 2;
  const projection = geoTransform({ point(lon, lat) { this.stream.point(offX + (lon - lonMin) * scale, offY + (latMax - lat) * scale); } });
  return geoPath().projection(projection);
}
