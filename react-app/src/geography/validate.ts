import { z } from 'zod';
import { psgcSchema } from './psgc';
import { codeProperty, nameProperty } from './types';
import type { GeographicLevel, GeographicResource } from './types';
import type { Polygon, MultiPolygon } from 'geojson';

/** Validate every coordinate without cloning the large nested arrays. The
 * browser CPU profile identified deep schema traversal/allocation as a startup
 * cost. This preserves the existing finite/range/ring checks and source data. */
function validPolygon(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (const ring of value) {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    for (const position of ring) {
      if (!Array.isArray(position) || position.length < 2) return false;
      for (const coordinate of position) if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) return false;
      if (position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) return false;
    }
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) return false;
  }
  return true;
}
const geometry = z.custom<Polygon | MultiPolygon>(value => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'Polygon') return validPolygon(candidate.coordinates);
  if (candidate.type !== 'MultiPolygon' || !Array.isArray(candidate.coordinates) || !candidate.coordinates.length) return false;
  for (const polygon of candidate.coordinates) if (!validPolygon(polygon)) return false;
  return true;
}, 'Invalid polygon geometry: finite geographic coordinates and closed rings required');
const featureSchema = z.object({ type: z.literal('Feature'), properties: z.record(z.string(), z.unknown()), geometry: geometry.nullable() }).passthrough();
const collectionSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(featureSchema) }).passthrough();
const nameSchema = z.string().min(1).nullable();

export function parseGeography(input: unknown, level: GeographicLevel): GeographicResource {
  const data = collectionSchema.parse(input);
  const seen = new Set<string>();
  const omittedNullGeometry: string[] = [];
  const missingNames: string[] = [];
  const features = data.features.flatMap(feature => {
    const code = psgcSchema.parse(feature.properties[codeProperty[level]]);
    const name = nameSchema.parse(feature.properties[nameProperty[level]]);
    if (name === null) missingNames.push(code);
    if (seen.has(code)) throw new Error(`Duplicate ${level} PSGC ${code}`);
    seen.add(code);
    if (!feature.geometry) { omittedNullGeometry.push(code); return []; }
    return [{ ...feature, geometry: feature.geometry }];
  });
  if (!features.length) throw new Error(`No renderable ${level} boundaries`);
  // Validation checks structure/ranges/rings, not topology or administrative accuracy.
  return { collection: { ...data, features }, omittedNullGeometry, missingNames };
}
