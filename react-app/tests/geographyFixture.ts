import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseConfig, type MapConfig } from '../src/config/schema';
import { ResourceCache } from '../src/geography/cache';
import { GeographicRepository } from '../src/geography/repository';

export function geographyFixture(overrides: Partial<MapConfig> = {}) {
  const calls: string[] = [];
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input)); calls.push(url.pathname);
    try { return new Response(readFileSync(path.resolve('..', url.pathname.slice(1)), 'utf8')); }
    catch { return new Response('', { status: 404 }); }
  };
  const config = parseConfig(overrides);
  return { config, calls, fetcher, repository: new GeographicRepository(config, 'https://map.test/data.json', new ResourceCache(fetcher)) };
}
