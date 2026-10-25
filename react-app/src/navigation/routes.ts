import { normalizePsgc } from '../geography/psgc';
import type { Psgc } from '../geography/types';

export type MapRoute =
  | { level: 'national' }
  | { level: 'region'; region: Psgc }
  | { level: 'province'; region: Psgc; province: Psgc }
  | { level: 'municity'; region: Psgc; province?: Psgc; municity: Psgc };

export function parseRoute(hash: string): MapRoute {
  const route = hash.replace(/^#/, '');
  if (route === '' || route === '/') return { level: 'national' };
  const match = /^\/?region\/(\d{1,10})(?:\/province\/(\d{1,10}))?(?:\/municity\/(\d{1,10}))?$/.exec(route);
  if (!match) throw new Error('Invalid map route');
  const region = normalizePsgc(match[1]);
  const province = match[2] ? normalizePsgc(match[2]) : undefined;
  if (match[3]) return { level: 'municity', region, ...(province ? { province } : {}), municity: normalizePsgc(match[3]) };
  if (province) return { level: 'province', region, province };
  return { level: 'region', region };
}

export function formatRoute(route: MapRoute): string {
  if (route.level === 'national') return '#/';
  let hash = `#/region/${route.region}`;
  if ('province' in route && route.province) hash += `/province/${route.province}`;
  if (route.level === 'municity') hash += `/municity/${route.municity}`;
  return hash;
}

export function parentRoute(route: MapRoute): MapRoute {
  if (route.level === 'municity' && route.province) return { level: 'province', region: route.region, province: route.province };
  if (route.level === 'province' || route.level === 'municity') return { level: 'region', region: route.region };
  return { level: 'national' };
}
