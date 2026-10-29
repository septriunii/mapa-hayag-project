// @vitest-environment node
import pilotProfiles from '../data/geographic-profiles.json';
import pilotSources from '../data/geographic-sources.json';
import regionalProfiles from '../data/regional-profiles.json';
import regionalSources from '../data/regional-sources.json';
import country from '../../../geo-nir/country.0.001.json';
const profiles = [...pilotProfiles, ...regionalProfiles];
const sources = [...pilotSources, ...regionalSources];
import { loadProfileCatalog, parseProfileCatalog } from './schema';
import { profileKeyForSelection } from './catalog';
import { normalizePsgc } from '../geography/psgc';
import { parseRoute } from '../navigation/routes';

it('covers the national view and every displayed region with validated source references', () => {
  const catalog = parseProfileCatalog(profiles, sources);
  expect(catalog.profiles.size).toBe(19);
  for (const feature of country.features) expect(catalog.profiles.has(`region:${String(feature.properties.adm1_psgc).padStart(10, '0')}`)).toBe(true);
  const national = catalog.profiles.get('national')!;
  expect(national.metrics.find(metric => metric.id === 'population')).toMatchObject({ value: 112729484, referenceDate: '2024-07-01' });
  expect(catalog.profiles.get('region:0900000000')!.metrics.find(metric => metric.id === 'area')?.value).toBe(18291.44);
});

it.each([
  (data: typeof profiles) => { data[0].metrics[0].referenceDate = null as unknown as string; },
  (data: typeof profiles) => { data[0].metrics[0].sourceIds = ['unknown']; },
  (data: typeof profiles) => { data[0].metrics[0].value = -1; },
  (data: typeof profiles) => { data[1].metrics[6].sourceIds = []; },
  (data: typeof profiles) => { data[1].key = 'region:900000000'; },
  (data: typeof profiles) => { data[0].sections[1].title = data[0].sections[0].title; },
  (data: typeof profiles) => { data[0].metrics[1].id = data[0].metrics[0].id; },
  (data: typeof profiles) => { data.push(data[0]); },
])('withholds malformed profile data without throwing into the map', mutate => {
  const data = structuredClone(profiles); mutate(data);
  expect(loadProfileCatalog(data, sources)).toMatchObject({ status: 'error' });
});

it.each(['javascript:alert(1)', 'http://psa.gov.ph', 'https://user:secret@psa.gov.ph'])('rejects unsafe source URL %s', url => {
  const data = structuredClone(sources); data[0].url = url;
  expect(loadProfileCatalog(profiles, data).status).toBe('error');
});

it('keys region selections independently from source padding and maximum-depth routes', () => {
  expect(profileKeyForSelection({ level: 'national' })).toBe('national');
  for (const psgc of ['900000000', '0900000000']) {
    expect(profileKeyForSelection({ level: 'national' }, { level: 'region', psgc: normalizePsgc(psgc) })).toBe('region:0900000000');
  }
  const route = parseRoute('#/region/900000000');
  expect(profileKeyForSelection(route, { level: 'province', psgc: normalizePsgc('907200000') })).toBeUndefined();
  expect(profileKeyForSelection(route, { level: 'municity', psgc: normalizePsgc('907201000') })).toBeUndefined();
  const catalog = parseProfileCatalog(profiles, sources);
  expect(catalog.profiles.get(profileKeyForSelection(route, { level: 'region', psgc: normalizePsgc('1300000000') })!)?.name).toContain('National Capital');
});
