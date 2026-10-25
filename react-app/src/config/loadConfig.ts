import { ResourceCache } from '../geography/cache';
import { parseConfig } from './schema';

export const resourceCache = new ResourceCache();
export function loadConfig(url: string, cache = resourceCache) {
  return cache.load(url, 'config', parseConfig);
}
