import { geoContains } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { getAllCountryFeaturesWithMeta, getCountryGeoJSON } from '../data/naturalEarthAdmin1';
import { drilldownRegistry } from '../config/drilldownConfig';
import type { TopologyGeometry } from '../config/drilldownConfig';
import type { TopoRegion } from './topojsonCache';
import { fetchRawTopology } from './topojsonCache';
import { normalizeString } from './searchUtils';

interface GeoJsonFeature {
  type: 'Feature';
  properties?: Record<string, string | number | boolean>;
  geometry: unknown;
}

/** Finds the app's actual store key by containing the city point in the loaded map. */
export async function resolvePlaceRegion(
  countryId: string, coordinates: [number, number], regions: TopoRegion[],
  territoryId?: string, areaName?: string
): Promise<TopoRegion | null> {
  const available = new Map(regions.map((region) => [region.id, region]));
  if (territoryId) return available.get(territoryId) ?? null;

  if (countryId === 'SOL') {
    const geoJson = await getCountryGeoJSON('SOL');
    for (const feature of geoJson?.features ?? []) {
      const id = available.get(`SOL-${feature.properties.iso_3166_2}`);
      if (id && geoContains(feature as unknown as GeoPermissibleObjects, coordinates)) return id;
    }
    return null;
  }

  const config = drilldownRegistry[countryId];
  if (config) {
    const raw = await fetchRawTopology(config.topoJsonUrl);
    if (raw && typeof raw === 'object' && 'type' in raw && raw.type === 'FeatureCollection' &&
      'features' in raw && Array.isArray(raw.features)) {
      for (const feature of raw.features as GeoJsonFeature[]) {
        if (!geoContains(feature as unknown as GeoPermissibleObjects, coordinates)) continue;
        const localId = config.regionIdExtractor?.(feature as unknown as TopologyGeometry);
        if (localId) return available.get(`${countryId}-${localId}`) ?? null;
      }
    }
    return null;
  }

  const features = await getAllCountryFeaturesWithMeta(countryId);
  for (const { regionId, feature } of features) {
    const canonical = available.get(`${countryId}-${regionId}`);
    if (canonical && geoContains(feature as unknown as GeoPermissibleObjects, coordinates)) {
      return canonical;
    }
  }
  // GeoNames administrative labels help when a coastal point falls just
  // outside the Natural Earth polygon. Require one exact name match.
  if (areaName) {
    const matches = regions.filter((region) => normalizeString(region.name) === normalizeString(areaName));
    if (matches.length === 1) return matches[0];
  }
  return null;
}
