import type { MapConfig } from '../config/schema';
import { ResourceCache } from './cache';
import { NCR, NCR_DISTRICTS, NIR, usesNirOverride } from './alignment';
import { featureCode, normalizePsgc } from './psgc';
import { parseGeography } from './validate';
import type { GeographicLevel, GeographicResource, GeographicView, SourcePsgc } from './types';

export class GeographicRepository {
  private readonly assets: URL;
  private readonly geographicBase: URL;
  constructor(private readonly config: MapConfig, configUrl: string, private readonly cache: ResourceCache) {
    this.assets = new URL('.', configUrl);
    const base = new URL(config.geoBasePath, configUrl);
    base.pathname = base.pathname.replace(/\/$/, '') + '/';
    this.geographicBase = base;
  }
  private geography(relative: string) { return new URL(`2023/geojson/${relative}`, this.geographicBase).href; }
  private asset(relative: string) { return new URL(relative, this.assets).href; }
  private load(url: string, level: GeographicLevel): Promise<GeographicResource> {
    return this.cache.load(url, `geography:${level}`, value => parseGeography(value, level));
  }

  national() {
    return this.load(this.config.alignment === 'nir' ? this.asset('geo-nir/country.0.001.json') : this.geography('country/lowres/country.0.001.json'), 'region');
  }
  async region(regionCode: SourcePsgc): Promise<GeographicView> {
    const region = normalizePsgc(regionCode);
    if (region === NIR && this.config.alignment === 'legacy') throw new Error('NIR is unavailable in legacy alignment');
    if (region === NCR) {
      const [national, ...districts] = await Promise.all([this.national(), ...NCR_DISTRICTS.map(code => this.load(this.geography(`provdists/medres/municities-provdist-${code}.0.01.json`), 'municity'))]);
      return {
        level: 'municity', collection: { type: 'FeatureCollection', features: districts.flatMap(d => d.collection.features) },
        background: { type: 'FeatureCollection', features: national.collection.features.filter(f => featureCode(f, 'region') === NCR) },
        warnings: districts.flatMap(resourceWarnings),
      };
    }
    const url = usesNirOverride(region, this.config.alignment) ? this.asset(`geo-nir/provdists-region-${region}.0.001.json`) : this.geography(`regions/lowres/provdists-region-${region}.0.001.json`);
    const data = await this.load(url, 'province');
    return { level: 'province', collection: data.collection, warnings: resourceWarnings(data) };
  }
  async province(provinceCode: SourcePsgc): Promise<GeographicView> {
    const province = normalizePsgc(provinceCode);
    // Supplementary boundaries are required; a failure must not silently hide cities.
    const [data, supplementary] = await Promise.all([
      this.load(this.geography(`provdists/lowres/municities-provdist-${province}.0.001.json`), 'municity'),
      this.load(this.asset('huc-boundaries.json'), 'municity'),
    ]);
    const features = [...data.collection.features];
    const seen = new Set(features.map(f => featureCode(f, 'municity')));
    for (const feature of supplementary.collection.features) {
      const parent = feature.properties.parent_prov_psgc;
      if (parent != null && normalizePsgc(parent) === province && !seen.has(featureCode(feature, 'municity'))) {
        features.push(feature);
        seen.add(featureCode(feature, 'municity'));
      }
    }
    return { level: 'municity', collection: { type: 'FeatureCollection', features }, warnings: [...resourceWarnings(data), ...resourceWarnings(supplementary)] };
  }
}

function resourceWarnings(resource: GeographicResource) {
  return [...resource.omittedNullGeometry.map(code => `Missing geometry: ${code}`), ...resource.missingNames.map(code => `Missing source name: ${code}`)];
}
