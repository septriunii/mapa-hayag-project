import { z } from 'zod';
import { psgcSchema } from '../geography/psgc';

const schemes = ['interpolateBlues', 'interpolateGreens', 'interpolateOranges', 'interpolateReds', 'interpolatePurples', 'interpolateYlOrRd', 'interpolateViridis', 'interpolatePlasma', 'interpolateMagma', 'interpolateInferno', 'interpolateCool', 'interpolateWarm'] as const;
const recordSchema = z.object({ psgc: psgcSchema }).catchall(z.json());
export const configSchema = z.object({
  title: z.string().default('MAPAhayag project'),
  description: z.string().default(''),
  alignment: z.enum(['nir', 'legacy']).default('nir'),
  maxDepth: z.enum(['region', 'province', 'municity']).default('municity'),
  geoBasePath: z.string().min(1).default('./philippines-json-maps'),
  colorField: z.string().optional(),
  colorDomain: z.tuple([z.number().finite(), z.number().finite()]).refine(([min, max]) => min < max, 'Color domain must increase').optional(),
  colorScheme: z.enum(schemes).optional(),
  detailFields: z.array(z.object({ key: z.string().min(1), label: z.string() })).default([]),
  data: z.object({
    region: z.array(recordSchema).default([]),
    province: z.array(recordSchema).default([]),
    municity: z.array(recordSchema).default([]),
  }).default({ region: [], province: [], municity: [] }),
}).superRefine((config, ctx) => {
  const colorOptions = [config.colorField, config.colorDomain, config.colorScheme];
  if (colorOptions.some(Boolean) && !colorOptions.every(Boolean)) ctx.addIssue({ code: 'custom', message: 'Specify colorField, colorDomain, and colorScheme together' });
  for (const level of ['region', 'province', 'municity'] as const) {
    const ids = new Set<string>();
    config.data[level].forEach((record, index) => {
      if (ids.has(record.psgc)) ctx.addIssue({ code: 'custom', path: ['data', level, index, 'psgc'], message: 'Duplicate PSGC' });
      ids.add(record.psgc);
      if (config.colorField && record[config.colorField] != null && (typeof record[config.colorField] !== 'number' || !Number.isFinite(record[config.colorField]))) ctx.addIssue({ code: 'custom', path: ['data', level, index, config.colorField], message: 'Color values must be finite numbers' });
    });
  }
});

export type MapConfig = z.infer<typeof configSchema>;
export type DataRecord = MapConfig['data']['region'][number];
export function parseConfig(input: unknown): MapConfig { return configSchema.parse(input); }
