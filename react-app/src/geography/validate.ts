import { z } from 'zod';
import { psgcSchema } from './psgc';
import { codeProperty, nameProperty } from './types';
import type { GeographicLevel, GeographicResource } from './types';

const position = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]).rest(z.number().finite());
const ring = z.array(position).min(4).refine(points => points[0]?.[0] === points.at(-1)?.[0] && points[0]?.[1] === points.at(-1)?.[1], 'Ring must be closed');
const polygon = z.array(ring).min(1);
const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygon }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1) }),
]);
const featureSchema = z.object({ type: z.literal('Feature'), properties: z.record(z.string(), z.unknown()), geometry: geometry.nullable() }).passthrough();
const collectionSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(featureSchema) }).passthrough();

export function parseGeography(input: unknown, level: GeographicLevel): GeographicResource {
  const data = collectionSchema.parse(input);
  const seen = new Set<string>();
  const omittedNullGeometry: string[] = [];
  const missingNames: string[] = [];
  const features = data.features.flatMap(feature => {
    const code = psgcSchema.parse(feature.properties[codeProperty[level]]);
    const name = z.string().min(1).nullable().parse(feature.properties[nameProperty[level]]);
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
