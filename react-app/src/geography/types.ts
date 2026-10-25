import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type Alignment = 'nir' | 'legacy';
export type GeographicLevel = 'region' | 'province' | 'municity';
export type Psgc = string & { readonly __psgc: unique symbol };
export type SourcePsgc = number | string;
export interface GeographicProperties {
  adm1_psgc?: SourcePsgc;
  adm2_psgc?: SourcePsgc;
  adm3_psgc?: SourcePsgc;
  adm1_en?: string | null;
  adm2_en?: string | null;
  adm3_en?: string | null;
  parent_prov_psgc?: SourcePsgc;
  geo_level?: string;
  [key: string]: unknown;
}
export type GeographicFeature = Feature<Polygon | MultiPolygon, GeographicProperties>;
export type GeographicCollection = FeatureCollection<Polygon | MultiPolygon, GeographicProperties>;
export interface GeographicResource {
  collection: GeographicCollection;
  omittedNullGeometry: string[];
  missingNames: string[];
}
export interface GeographicView {
  level: GeographicLevel;
  collection: GeographicCollection;
  background?: GeographicCollection;
  warnings: string[];
}

export const codeProperty = { region: 'adm1_psgc', province: 'adm2_psgc', municity: 'adm3_psgc' } as const;
export const nameProperty = { region: 'adm1_en', province: 'adm2_en', municity: 'adm3_en' } as const;
