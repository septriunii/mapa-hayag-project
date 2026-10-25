import { z } from 'zod';
import type { GeographicFeature, GeographicLevel, Psgc } from './types';
import { codeProperty } from './types';

// Normalize representation only. Never infer code-vintage conversions or ancestry.
export const psgcSchema = z.union([
  z.number().int().positive().max(9_999_999_999),
  z.string().regex(/^\d{1,10}$/),
]).transform(value => String(BigInt(value)) as Psgc).refine(value => value !== '0', 'PSGC must be positive');

export function normalizePsgc(value: unknown): Psgc { return psgcSchema.parse(value); }
export function featureCode(feature: GeographicFeature, level: GeographicLevel): Psgc {
  return normalizePsgc(feature.properties[codeProperty[level]]);
}
