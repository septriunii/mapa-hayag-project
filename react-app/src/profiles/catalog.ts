import profiles from '../data/geographic-profiles.json';
import sources from '../data/geographic-sources.json';
import type { MapRoute } from '../navigation/routes';
import type { LocationDetails } from '../navigation/view';
import { normalizePsgc } from '../geography/psgc';
import { loadProfileCatalog } from './schema';

// Local editorial data: validated once and independent of data.json/geography.
export const profileCatalog = loadProfileCatalog(profiles, sources);

export function profileKeyForSelection(route: MapRoute, selection?: Pick<LocationDetails, 'level' | 'psgc'>) {
  if (selection?.level === 'region') return `region:${normalizePsgc(selection.psgc).padStart(10, '0')}`;
  if (route.level === 'national' && !selection) return 'national';
  return undefined;
}
