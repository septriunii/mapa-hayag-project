import type { MapConfig, DataRecord } from '../config/schema';
import { NCR, NCR_DISTRICTS } from '../geography/alignment';
import { featureCode } from '../geography/psgc';
import type { GeographicRepository } from '../geography/repository';
import type { GeographicCollection, GeographicFeature, GeographicLevel, GeographicView, Psgc } from '../geography/types';
import { nameProperty } from '../geography/types';
import { parentRoute, type MapRoute } from './routes';

export interface LocationDetails {
  name: string;
  parent: string;
  typeLabel: string;
  record?: DataRecord;
}
export interface MapView extends GeographicView {
  route: MapRoute;
  details?: LocationDetails;
  backLabel?: string;
  statusText: string;
}

export function locationDetails(feature: GeographicFeature, level: GeographicLevel, parent: string, config: MapConfig): LocationDetails {
  return {
    name: feature.properties[nameProperty[level]] ?? featureCode(feature, level), parent,
    typeLabel: { region: 'Region', province: 'Province / District', municity: 'City / Municipality' }[level],
    record: config.data[level].find(record => record.psgc === featureCode(feature, level)),
  };
}

function find(collection: GeographicCollection, level: GeographicLevel, code: Psgc) {
  const feature = collection.features.find(feature => featureCode(feature, level) === code);
  if (!feature) throw new Error(`Unknown ${level} PSGC ${code} in this map hierarchy`);
  return feature;
}

/** Resolve ancestry through the displayed collections, never by slicing PSGCs.
 * NIR uses its view grouping while all source feature identifiers stay intact. */
export async function resolveView(route: MapRoute, config: MapConfig, national: GeographicCollection, repository: GeographicRepository): Promise<MapView> {
  const country: MapView = { route: { level: 'national' }, level: 'region', collection: national, warnings: [], statusText: `${national.features.length} regions — click to drill in` };
  if (route.level === 'national') return country;
  const region = find(national, 'region', route.region);
  const regionDetails = locationDetails(region, 'region', 'Philippines', config);
  if (config.maxDepth === 'region') return { ...country, details: regionDetails };

  const regional = await repository.region(route.region);
  const regionView: MapView = {
    ...regional, route: { level: 'region', region: route.region }, details: regionDetails, backLabel: 'Philippines',
    statusText: `${regionDetails.name} — ${regional.collection.features.length} ${regional.level === 'municity' ? 'cities/municipalities' : 'provinces'}`,
  };
  if (route.level === 'region') return regionView;

  // Older NCR URLs contain the source district. Accept them, but expose the
  // same direct city hierarchy used by the map and its Back button.
  if (route.region === NCR) {
    if (route.province && !NCR_DISTRICTS.includes(route.province)) throw new Error('Unknown NCR district');
    if (route.level === 'province') return regionView;
    const city = find(regional.collection, 'municity', route.municity);
    if (route.province && featureCode(city, 'province') !== route.province) throw new Error('City does not belong to this NCR district');
    return isolatedCity(city, { level: 'municity', region: route.region, municity: route.municity }, regionDetails.name, config, regional.warnings);
  }
  if (!route.province) throw new Error('A province is required for this city / municipality');
  const province = find(regional.collection, 'province', route.province);
  const provinceDetails = locationDetails(province, 'province', regionDetails.name, config);
  if (config.maxDepth === 'province') return { ...regionView, details: provinceDetails };
  const provincial = await repository.province(route.province);
  const warnings = [...regional.warnings, ...provincial.warnings];
  const provinceView: MapView = {
    ...provincial, warnings, route: { level: 'province', region: route.region, province: route.province },
    details: provinceDetails, backLabel: regionDetails.name,
    statusText: `${provinceDetails.name} — ${provincial.collection.features.length} municipalities/cities`,
  };
  if (route.level === 'province') return provinceView;
  return isolatedCity(find(provincial.collection, 'municity', route.municity), route, provinceDetails.name, config, warnings);
}

function isolatedCity(city: GeographicFeature, route: MapRoute, parent: string, config: MapConfig, warnings: string[]): MapView {
  const details = locationDetails(city, 'municity', parent, config);
  return { route, level: 'municity', collection: { type: 'FeatureCollection', features: [city] }, warnings, details, backLabel: parent, statusText: details.name };
}

export function selectionRoute(view: MapView, feature: GeographicFeature, config: MapConfig): MapRoute | undefined {
  const route = view.route;
  if (route.level === 'national') return config.maxDepth === 'region' ? undefined : { level: 'region', region: featureCode(feature, 'region') };
  if (route.level === 'region') {
    if (view.level === 'municity') return { level: 'municity', region: route.region, municity: featureCode(feature, 'municity') };
    return config.maxDepth === 'province' ? undefined : { level: 'province', region: route.region, province: featureCode(feature, 'province') };
  }
  if (route.level === 'province') return { level: 'municity', region: route.region, province: route.province, municity: featureCode(feature, 'municity') };
  return undefined;
}

export function parentOfView(view: MapView) { return parentRoute(view.route); }
