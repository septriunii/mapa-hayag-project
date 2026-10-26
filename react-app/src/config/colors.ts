import { scaleSequential, interpolateBlues, interpolateGreens, interpolateOranges, interpolateReds, interpolatePurples, interpolateYlOrRd, interpolateViridis, interpolatePlasma, interpolateMagma, interpolateInferno, interpolateCool, interpolateWarm } from 'd3';
import type { MapConfig } from './schema';
import type { GeographicLevel, SourcePsgc } from '../geography/types';
import { normalizePsgc } from '../geography/psgc';

export function createColorLookup(config: MapConfig) {
  const interpolators = { interpolateBlues, interpolateGreens, interpolateOranges, interpolateReds, interpolatePurples, interpolateYlOrRd, interpolateViridis, interpolatePlasma, interpolateMagma, interpolateInferno, interpolateCool, interpolateWarm };
  const records = Object.fromEntries((['region', 'province', 'municity'] as const).map(level => [level, new Map(config.data[level].map(record => [record.psgc, record]))]));
  const { colorField, colorDomain, colorScheme } = config;
  const scale = colorDomain && colorScheme ? scaleSequential(interpolators[colorScheme]).domain(colorDomain).clamp(true) : undefined;
  return (level: GeographicLevel, code: SourcePsgc) => {
    const value = colorField ? records[level].get(normalizePsgc(code))?.[colorField] : undefined;
    return scale && typeof value === 'number' ? scale(value) : 'var(--color-land)';
  };
}
