// @vitest-environment node
import { geographyFixture } from '../../tests/geographyFixture';
import { featureCode } from '../geography/psgc';
import { formatRoute, parentRoute, parseRoute } from './routes';
import { resolveView, selectionRoute } from './view';

it('resolves ordinary geographic ancestry down to an isolated city', async () => {
  const { config, repository } = geographyFixture();
  const national = (await repository.national()).collection;
  const region = await resolveView(parseRoute('#/region/900000000'), config, national, repository);
  expect(region.collection.features).toHaveLength(4);
  const province = region.collection.features.find(f => featureCode(f, 'province') === '907200000')!;
  const route = selectionRoute(region, province, config)!;
  const provincial = await resolveView(route, config, national, repository);
  expect(provincial.details?.name).toBe('Zamboanga del Norte');
  const city = provincial.collection.features[0];
  const municipal = await resolveView(selectionRoute(provincial, city, config)!, config, national, repository);
  expect(municipal.collection.features).toEqual([city]);
  expect(municipal.details?.name).toBe('City of Dapitan');
  expect(municipal.backLabel).toBe('Zamboanga del Norte');
  expect(parentRoute(municipal.route)).toEqual(route);
});

it.each([['nir', '1800000000'], ['legacy', '600000000']] as const)('keeps Bacolod under the displayed %s ancestry', async (alignment, region) => {
  const { config, repository } = geographyFixture({ alignment });
  const national = (await repository.national()).collection;
  const provincial = await resolveView(parseRoute(`#/region/${region}/province/604500000`), config, national, repository);
  const bacolod = provincial.collection.features.find(f => featureCode(f, 'municity') === '630200000')!;
  const route = selectionRoute(provincial, bacolod, config)!;
  expect(formatRoute(route)).toBe(`#/region/${region}/province/604500000/municity/630200000`);
  const city = await resolveView(route, config, national, repository);
  expect(city.details?.parent).toBe('Negros Occidental');
  expect(city.collection.features[0].properties.adm1_psgc).toBe(600000000);
});

it('canonicalizes old NCR district city links and returns directly to NCR', async () => {
  const { config, repository } = geographyFixture();
  const national = (await repository.national()).collection;
  const city = await resolveView(parseRoute('#/region/1300000000/province/1303900000/municity/1380600000'), config, national, repository);
  expect(formatRoute(city.route)).toBe('#/region/1300000000/municity/1380600000');
  expect(formatRoute(parentRoute(city.route))).toBe('#/region/1300000000');
  expect(city.details?.name).toBe('City of Manila');
});

it.each([
  '#/region/1',
  '#/region/900000000/province/702200000',
  '#/region/900000000/municity/907201000',
  '#/region/900000000/province/907200000/municity/630200000',
  '#/region/600000000/province/604500000',
  '#/region/1300000000/province/1307400000/municity/1380600000',
])('rejects nonexistent or mismatched hierarchy %s', async hash => {
  const { config, repository } = geographyFixture();
  const national = (await repository.national()).collection;
  await expect(resolveView(parseRoute(hash), config, national, repository)).rejects.toThrow();
});

it.each(['region', 'province'] as const)('honors maxDepth=%s without fetching deeper resources', async maxDepth => {
  const { config, repository, calls } = geographyFixture({ maxDepth });
  const national = (await repository.national()).collection;
  const view = await resolveView(parseRoute('#/region/900000000/province/907200000/municity/907201000'), config, national, repository);
  expect(view.route.level).toBe(maxDepth === 'region' ? 'national' : 'region');
  expect(view.details?.typeLabel).toBe(maxDepth === 'region' ? 'Region' : 'Province / District');
  expect(calls.some(url => url.includes('/provdists/'))).toBe(false);
});

it('surfaces source geometry warnings and malformed SGA errors', async () => {
  const { config, repository } = geographyFixture();
  const national = (await repository.national()).collection;
  const view = await resolveView(parseRoute('#/region/1700000000/province/1705300000'), config, national, repository);
  expect(view.warnings).toContain('Missing geometry: 1705321000');
  await expect(resolveView(parseRoute('#/region/1900000000/province/1909900000'), config, national, repository)).rejects.toThrow();
});
