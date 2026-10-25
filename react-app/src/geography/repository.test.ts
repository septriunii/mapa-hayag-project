// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseConfig } from '../config/schema';
import { ResourceCache } from './cache';
import { GeographicRepository } from './repository';
import { featureCode, normalizePsgc } from './psgc';
import { viewRegion } from './alignment';
import { parseGeography } from './validate';
import { boundsFromFeatures, makePath } from './projection';
import type { Alignment } from './types';

function setup(alignment: Alignment = 'nir') {
  const calls: string[] = [];
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input)); calls.push(url.pathname);
    try { return new Response(readFileSync(path.resolve('..', url.pathname.slice(1)), 'utf8')); }
    catch { return new Response('', { status: 404 }); }
  };
  const repository = new GeographicRepository(parseConfig({ alignment }), 'https://map.test/data.json', new ResourceCache(fetcher));
  return { repository, calls };
}

describe('pinned geographic datasets', () => {
  it.each([['nir', 18, 5, 2], ['legacy', 17, 6, 4]] as const)('preserves %s national and VI/VII membership', async (alignment, national, r6, r7) => {
    const { repository } = setup(alignment);
    expect((await repository.national()).collection.features).toHaveLength(national);
    expect((await repository.region(600000000)).collection.features).toHaveLength(r6);
    expect((await repository.region(700000000)).collection.features).toHaveLength(r7);
  });
  it('loads exactly the three NIR provinces and preserves their source codes', async () => {
    const { repository } = setup();
    const provinces = await repository.region(1800000000);
    expect(provinces.collection.features.map(f => featureCode(f, 'province'))).toEqual(['604500000', '704600000', '706100000']);
    const city = (await repository.province(604500000)).collection.features.find(f => featureCode(f, 'municity') === '630200000')!;
    expect(city.properties.adm1_psgc).toBe(600000000);
    expect(viewRegion(city.properties.parent_prov_psgc!, city.properties.adm1_psgc!, 'nir')).toBe('1800000000');
    expect(viewRegion(city.properties.parent_prov_psgc!, city.properties.adm1_psgc!, 'legacy')).toBe('600000000');
  });
  it('combines NCR medres districts and retains the regional background', async () => {
    const { repository, calls } = setup();
    const view = await repository.region(1300000000);
    expect(view.level).toBe('municity');
    expect(view.collection.features).toHaveLength(17);
    expect(new Set(view.collection.features.map(f => featureCode(f, 'municity'))).size).toBe(17);
    expect(view.background?.features).toHaveLength(1);
    expect(calls.filter(url => url.includes('/medres/'))).toHaveLength(4);
  });
  it('reuses downloaded resources across province revisits', async () => {
    const { repository, calls } = setup();
    await Promise.all([repository.province(702200000), repository.province(702200000)]);
    await repository.province(702200000);
    expect(calls).toHaveLength(2);
  });
  it('reports the five pinned null geometries instead of passing them into D3', async () => {
    const { repository } = setup();
    for (const code of [1204700000, 1705300000, 403400000, 405800000, 806400000]) {
      const view = await repository.province(code);
      expect(view.warnings).toHaveLength(1);
      expect(view.collection.features.every(f => !!f.geometry)).toBe(true);
    }
  });
  it('fails explicitly for the malformed SGA collection, without modifying it', async () => {
    const { repository } = setup();
    expect((await repository.region(1900000000)).warnings).toContain('Missing source name: 1909900000');
    await expect(repository.province(1909900000)).rejects.toThrow();
  });
  it('validates all renderable national/region/province resources used by both alignments', async () => {
    const { repository } = setup('legacy');
    const national = await repository.national();
    for (const region of national.collection.features) {
      const provinces = await repository.region(featureCode(region, 'region'));
      if (provinces.level !== 'province') continue;
      for (const province of provinces.collection.features) {
        if (featureCode(province, 'province') === '1909900000') continue;
        const view = await repository.province(featureCode(province, 'province'));
        expect(view.collection.features.length).toBeGreaterThan(0);
      }
    }
  });
  it('rejects duplicate PSGC features and malformed rings', async () => {
    const data = (await setup().repository.national()).collection;
    expect(() => parseGeography({ ...data, features: [data.features[0], data.features[0]] }, 'region')).toThrow('Duplicate');
    expect(() => parseGeography({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { adm1_psgc: 1, adm1_en: 'X' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0]]] } }] }, 'region')).toThrow();
  });
  it('produces finite national SVG paths and rejects empty bounds', async () => {
    const features = (await setup().repository.national()).collection.features;
    const path = makePath(1440, 900);
    for (const feature of features) expect(path(feature)).not.toMatch(/NaN|Infinity/);
    expect(boundsFromFeatures(features).lonMin).toBeGreaterThan(100);
    expect(() => boundsFromFeatures([])).toThrow();
    expect(normalizePsgc('0604500000')).toBe('604500000');
  });
});
