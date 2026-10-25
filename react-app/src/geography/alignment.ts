import { normalizePsgc } from './psgc';
import type { Alignment, SourcePsgc } from './types';

export const NIR = normalizePsgc(1800000000);
export const NCR = normalizePsgc(1300000000);
export const NCR_DISTRICTS = [1303900000, 1307400000, 1307500000, 1307600000].map(normalizePsgc);
const legacyRegions = new Map([[normalizePsgc(604500000), normalizePsgc(600000000)], [normalizePsgc(704600000), normalizePsgc(700000000)], [normalizePsgc(706100000), normalizePsgc(700000000)]]);

/** View grouping only: source PSGC codes and feature properties remain unchanged. */
export function viewRegion(province: SourcePsgc, sourceRegion: SourcePsgc, alignment: Alignment) {
  const legacy = legacyRegions.get(normalizePsgc(province));
  return legacy ? (alignment === 'nir' ? NIR : legacy) : normalizePsgc(sourceRegion);
}

export function usesNirOverride(region: SourcePsgc, alignment: Alignment) {
  return alignment === 'nir' && ['600000000', '700000000', NIR].includes(normalizePsgc(region));
}
