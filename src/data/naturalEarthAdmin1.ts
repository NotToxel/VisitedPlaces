// Natural Earth admin-1 (states/provinces) data layer.
// Fetches the global NE GeoJSON, caches in memory, and provides
// per-country geometry extraction and bounding box computation.

import { NE_ADMIN1_URL } from '../config/urls';

// ── Types ─────────────────────────────────────────────────────────────────

/** Properties available on NE admin-1 GeoJSON features. */
export interface NEFeatureProperties {
  adm0_a3: string;      // Parent country ISO-A3 (e.g., "FRA")
  iso_3166_2: string;   // ISO 3166-2 code (e.g., "FR-ARA")
  name: string;         // Region name (e.g., "Auvergne-Rhône-Alpes")
  type_en: string;      // Administrative type in English
  admin: string;        // Parent country name
  [key: string]: unknown;
}

export interface NEFeature {
  type: 'Feature';
  properties: NEFeatureProperties;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

export interface NEFeatureCollection {
  type: 'FeatureCollection';
  features: NEFeature[];
}

export interface NERegion {
  iso_3166_2: string;   // e.g., "US-CA"
  name: string;         // e.g., "California"
  parentA3: string;     // e.g., "USA"
}

export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  centerLng: number;
  centerLat: number;
}

/**
 * Computes the Mercator-aware projection scale for a drilldown view.
 * Uses the exact Mercator projection formula to compute how many pixels
 * the country's lat/lng extent would occupy, then picks the scale that
 * makes both dimensions fit within the 800×500 viewport.
 *
 * d3 geoMercator at scale S:
 *   x = S · λ           (λ in radians)
 *   y = S · ln(tan(π/4 + φ/2))   (φ in radians)
 */
export function computeAutoScale(bbox: BBox): number {
  const DEG2RAD = Math.PI / 180;

  // Horizontal extent in projection units (radians of longitude)
  const lngSpanRad = (bbox.maxLng - bbox.minLng) * DEG2RAD;

  // Vertical extent using exact Mercator formula
  const mercatorY = (latDeg: number): number => {
    const latRad = latDeg * DEG2RAD;
    return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  };
  const mercatorHeight = Math.abs(mercatorY(bbox.maxLat) - mercatorY(bbox.minLat));

  // Scale that fits each dimension in the viewport (800×500)
  const scaleForWidth = lngSpanRad > 0.001 ? 800 / lngSpanRad : 24000;
  const scaleForHeight = mercatorHeight > 0.001 ? 500 / mercatorHeight : 24000;

  // Use the most constrained dimension, with 15% padding
  const fitScale = Math.min(scaleForWidth, scaleForHeight) * 0.85;

  // Clamp: don't over-zoom tiny countries
  return Math.min(Math.max(fitScale, 50), 24000);
}

// ── In-memory cache ───────────────────────────────────────────────────────

let cachedData: NEFeatureCollection | null = null;
let pendingFetch: Promise<NEFeatureCollection | null> | null = null;
const countryGeoCache: Record<string, NEFeatureCollection> = {};
const countryBBoxCache: Record<string, BBox> = {};

/**
 * Fetches and caches the global NE admin-1 GeoJSON.
 * Idempotent — repeated calls return the cached promise/data.
 */
async function fetchNEAdmin1(): Promise<NEFeatureCollection | null> {
  if (cachedData) return cachedData;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    // 1. Try CacheStorage first for persistent cross-session caching of large NE GeoJSON
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open('visited-places-geo-cache-v1');
        const cachedResponse = await cache.match(NE_ADMIN1_URL);
        if (cachedResponse) {
          const data = await cachedResponse.json() as NEFeatureCollection;
          cachedData = data;
          return data;
        }
      } catch (err) {
        console.warn('Cache Storage read failed for NE admin-1:', err);
      }
    }

    // 2. Fetch from network if not cached
    try {
      const res = await fetch(NE_ADMIN1_URL);
      if (!res.ok) throw new Error(`NE admin-1 fetch failed: ${res.status}`);
      
      const resClone = res.clone();
      const data = await res.json() as NEFeatureCollection;
      
      // Persist to CacheStorage asynchronously
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.open('visited-places-geo-cache-v1')
          .then((cache) => cache.put(NE_ADMIN1_URL, resClone))
          .catch((err) => console.warn('Cache Storage write failed for NE admin-1:', err));
      }

      cachedData = data;
      return data;
    } catch (err) {
      console.error('Failed to fetch Natural Earth admin-1 data:', err);
      return null;
    }
  })();

  pendingFetch.finally(() => {
    pendingFetch = null;
  });

  return pendingFetch;
}

/**
 * Low-priority prefetch — call on app mount.
 * Resolves to true if fetch succeeded, false otherwise.
 */
export async function prefetchNaturalEarth(): Promise<boolean> {
  try {
    const data = await fetchNEAdmin1();
    return data !== null;
  } catch {
    return false;
  }
}

function shiftRussiaCoords(coords: unknown): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const arr = coords as [number, number];
    if (arr[0] < 0) {
      arr[0] += 360;
    }
    return;
  }
  for (const item of coords) {
    shiftRussiaCoords(item);
  }
}

function shiftUsaCoords(coords: unknown): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const arr = coords as [number, number];
    if (arr[0] > 0) {
      arr[0] -= 360;
    }
    return;
  }
  for (const item of coords) {
    shiftUsaCoords(item);
  }
}

/**
 * Filters the subdivisions of a country, excluding far-flung overseas departments or autonomous islands.
 * This ensures the map bounding box zoom and centering are tight and focused on the main landmass.
 */
function getCountryMainlandFeatures(countryA3: string, data: NEFeatureCollection): NEFeature[] {
  let features = data.features.filter(
    (f) => (
      f.properties?.adm0_a3 === countryA3 ||
      (countryA3 === 'XKX' && (
        f.properties?.adm0_a3 === 'KOS' ||
        f.properties?.adm0_a3 === 'XKX' ||
        f.properties?.admin === 'Kosovo' ||
        f.properties?.geounit === 'Kosovo' ||
        f.properties?.gu_a3 === 'KOS' ||
        f.properties?.gu_a3 === 'XKX' ||
        f.properties?.sov_a3 === 'KOS' ||
        f.properties?.sov_a3 === 'XKX'
      )) ||
      (countryA3 === 'SOL' && (
        f.properties?.adm0_a3 === 'SOL' ||
        f.properties?.admin === 'Somaliland' ||
        f.properties?.geounit === 'Somaliland' ||
        f.properties?.gu_a3 === 'SOL' ||
        f.properties?.sov_a3 === 'SOL'
      )) ||
      (countryA3 === 'GBR' && f.properties?.adm0_a3 === 'IMN')
    ) &&
    f.properties?.name !== null &&
    f.properties?.name !== undefined &&
    f.properties?.name !== ''
  );

  if (countryA3 === 'SRB') {
    // Exclude Kosovo sub-regions from Serbia
    features = features.filter(
      (f) => f.properties?.admin !== 'Kosovo' &&
             f.properties?.geounit !== 'Kosovo' &&
             f.properties?.adm0_a3 !== 'KOS' &&
             f.properties?.adm0_a3 !== 'XKX' &&
             f.properties?.gu_a3 !== 'KOS' &&
             f.properties?.gu_a3 !== 'XKX' &&
             f.properties?.sov_a3 !== 'KOS' &&
             f.properties?.sov_a3 !== 'XKX'
    );
  } else if (countryA3 === 'SOM') {
    // Exclude Somaliland sub-regions from Somalia
    features = features.filter(
      (f) => f.properties?.admin !== 'Somaliland' &&
             f.properties?.geounit !== 'Somaliland' &&
             f.properties?.adm0_a3 !== 'SOL' &&
             f.properties?.gu_a3 !== 'SOL' &&
             f.properties?.sov_a3 !== 'SOL'
    );
  } else if (countryA3 === 'FRA') {
    // Exclude overseas departments (Guadeloupe, Martinique, Reunion, Mayotte, French Guiana)
    features = features.filter(
      (f) => f.properties?.type_en !== 'Overseas department' &&
             f.properties?.type !== 'Overseas département'
    );
  } else if (countryA3 === 'ESP') {
    // Exclude Canary Islands, Ceuta, and Melilla
    const EXCLUDED_ESP_ISOS = new Set(['ES-TF', 'ES-GC', 'ES-CE', 'ES-ML']);
    features = features.filter(
      (f) => !f.properties?.iso_3166_2 || !EXCLUDED_ESP_ISOS.has(f.properties.iso_3166_2)
    );
  } else if (countryA3 === 'PRT') {
    // Exclude Azores and Madeira
    const EXCLUDED_PRT_ISOS = new Set(['PT-20', 'PT-30', 'PT-20R', 'PT-30R']);
    features = features.filter(
      (f) => !f.properties?.iso_3166_2 || !EXCLUDED_PRT_ISOS.has(f.properties.iso_3166_2)
    );
  } else if (countryA3 === 'NZL') {
    // Exclude Chatham Islands, Kermadec Islands, and Subantarctic Islands
    // from the main map so New Zealand centers cleanly on North/South Islands.
    features = features.filter((f) => {
      const name = (f.properties?.name || '').toString();
      const iso = (f.properties?.iso_3166_2 || '').toString();
      if (
        name.includes('Chatham') ||
        name.includes('Kermadec') ||
        name.includes('Area Outside') ||
        iso === 'NZ-CIT' ||
        iso === 'NZ-CHA' ||
        iso === 'NZ-KER'
      ) {
        return false;
      }
      let maxLat = -90;
      let minLat = 90;
      let maxLng = -360;
      let minLng = 360;
      function checkCoords(coords: unknown) {
        if (!Array.isArray(coords)) return;
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          const [rawLng, lat] = coords as [number, number];
          let lng = rawLng;
          if (lng < 0) lng += 360;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          return;
        }
        for (const item of coords) checkCoords(item);
      }
      checkCoords(f.geometry?.coordinates);
      // Mainland NZ lat range: -47.5 to -34.0, lng range: 166.0 to 178.8
      if (maxLat > -33.5 || minLat < -47.8 || maxLng > 179.0 || minLng < 165.0) {
        return false;
      }
      return true;
    });
    features.forEach((f) => {
      if (f.geometry?.coordinates) {
        shiftRussiaCoords(f.geometry.coordinates);
      }
    });
  } else if (countryA3 === 'CHL') {
    // Exclude Easter Island (Rapa Nui), Juan Fernández Islands, and Desventuradas Islands
    // so mainland Chile centers cleanly on South America (-75.6°W to -66.5°W).
    features = features.filter((f) => {
      const name = (f.properties?.name || '').toString();
      const iso = (f.properties?.iso_3166_2 || '').toString();
      if (
        name.includes('Pascua') ||
        name.includes('Easter') ||
        name.includes('Fernández') ||
        name.includes('Desventuradas') ||
        iso === 'CL-EA'
      ) {
        return false;
      }
      let minLng = 180;
      function checkCoords(coords: unknown) {
        if (!Array.isArray(coords)) return;
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          const [lng] = coords as [number, number];
          if (lng < minLng) minLng = lng;
          return;
        }
        for (const item of coords) checkCoords(item);
      }
      checkCoords(f.geometry?.coordinates);
      // Mainland Chile longitude range: -76.0°W to -66.0°W
      if (minLng < -76.5) return false;
      return true;
    });
  } else if (countryA3 === 'RUS' || countryA3 === 'FJI' || countryA3 === 'KIR') {
    // Russia, Fiji, and Kiribati span the antimeridian.
    // Shift any negative longitudes by +360 degrees so D3 maps can project them contiguously
    // with the rest of their landmass instead of wrapping around the globe.
    features.forEach((f) => {
      if (f.geometry?.coordinates) {
        shiftRussiaCoords(f.geometry.coordinates);
      }
    });
  } else if (countryA3 === 'USA') {
    // USA (Alaska Aleutian Islands) spans the antimeridian.
    // Shift any positive longitudes by -360 degrees so they sit contiguously in the negative range.
    features.forEach((f) => {
      if (f.geometry?.coordinates) {
        shiftUsaCoords(f.geometry.coordinates);
      }
    });
  } else if (countryA3 === 'MUS') {
    // Exclude Rodrigues Island and Agalega Islands from the main map of Mauritius
    features = features.filter(
      (f) => f.properties?.type_en !== 'Dependency' &&
             f.properties?.type !== 'Dependency'
    );
  }

  return features;
}

/**
 * Returns all admin-1 regions for a given country (by ISO-A3 code).
 * Extracts ISO 3166-2 codes and display names from NE properties.
 */
export async function getCountryRegions(countryA3: string): Promise<NERegion[]> {
  if (countryA3 === 'SOL') {
    return [
      { iso_3166_2: 'SOL-AW', name: 'Awdal', parentA3: 'SOL' },
      { iso_3166_2: 'SOL-WO', name: 'Maroodi Jeex (Woqooyi Galbeed)', parentA3: 'SOL' },
      { iso_3166_2: 'SOL-SH', name: 'Sahil', parentA3: 'SOL' },
      { iso_3166_2: 'SOL-TO', name: 'Togdheer', parentA3: 'SOL' },
      { iso_3166_2: 'SOL-SA', name: 'Sanaag', parentA3: 'SOL' },
      { iso_3166_2: 'SOL-SO', name: 'Sool', parentA3: 'SOL' },
    ];
  }

  const data = await fetchNEAdmin1();
  if (!data) return [];

  const features = getCountryMainlandFeatures(countryA3, data);

  // Pre-pass: count occurrences of name and iso_3166_2
  const isoCounts: Record<string, number> = {};
  const nameCounts: Record<string, number> = {};
  for (const f of features) {
    const props = f.properties;
    if (props) {
      let iso = props.iso_3166_2 || '';
      if (countryA3 === 'GBR' && props.adm0_a3 === 'IMN') {
        iso = 'IM';
      }
      const name = props.name || '';
      if (iso) isoCounts[iso] = (isoCounts[iso] || 0) + 1;
      if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
  }

  const regions: NERegion[] = [];
  const seenIds = new Set<string>();

  for (const f of features) {
    const props = f.properties;
    let iso = props?.iso_3166_2 || '';
    if (countryA3 === 'GBR' && props?.adm0_a3 === 'IMN') {
      iso = 'IM';
    }
    const name = props?.name || 'Unknown';
    const typeEn = props?.type_en || '';

    // Determine if it has duplicates
    const hasIsoDuplicate = iso && (isoCounts[iso] > 1);
    const hasNameDuplicate = name && (nameCounts[name] > 1);

    // Build differentiated ID and name
    let regionId = iso || `${countryA3}-${slugify(name)}`;
    let displayName = name;

    if ((hasIsoDuplicate || hasNameDuplicate) && typeEn) {
      // e.g. "Cork (County)" vs "Cork (City)"
      displayName = `${name} (${typeEn})`;
      // e.g. "IE-CO-county" vs "IE-CO-city"
      regionId = `${regionId}-${slugify(typeEn)}`;
    }

    if (seenIds.has(regionId)) continue;
    seenIds.add(regionId);

    regions.push({
      iso_3166_2: regionId,
      name: displayName,
      parentA3: countryA3,
    });
  }

  regions.sort((a, b) => a.name.localeCompare(b.name));
  return regions;
}

/**
 * Extracts the GeoJSON features for a specific country from the global dataset.
 * Returns a new GeoJSON FeatureCollection containing only that country's admin-1 geometries.
 */
export async function getCountryGeoJSON(countryA3: string): Promise<NEFeatureCollection | null> {
  if (countryGeoCache[countryA3]) return countryGeoCache[countryA3];
  if (countryA3 === 'SOL') {
    countryGeoCache[countryA3] = SOMALILAND_SUBREGIONS_GEOJSON;
    return SOMALILAND_SUBREGIONS_GEOJSON;
  }

  const data = await fetchNEAdmin1();
  if (!data) return null;

  const features = getCountryMainlandFeatures(countryA3, data);

  if (features.length === 0) return null;

  const result: NEFeatureCollection = {
    type: 'FeatureCollection',
    features,
  };
  countryGeoCache[countryA3] = result;
  return result;
}

/** A single region's NE feature paired with resolved metadata. */
export interface NERegionFeature {
  regionId: string;
  displayName: string;
  feature: NEFeature;
}

/**
 * Returns ALL admin-1 features for a country (no mainland filtering),
 * each paired with its resolved region ID and display name.
 * Used by the card grid to render individual mini-map SVGs per region.
 */
export async function getAllCountryFeaturesWithMeta(countryA3: string): Promise<NERegionFeature[]> {
  const data = await fetchNEAdmin1();
  if (!data) return [];

  // Get features for this country (using mainland filtering to respect entity boundaries like Kosovo)
  const features = getCountryMainlandFeatures(countryA3, data);

  if (features.length === 0) return [];

  // Pre-pass: count occurrences for duplicate detection
  const isoCounts: Record<string, number> = {};
  const nameCounts: Record<string, number> = {};
  for (const f of features) {
    const props = f.properties;
    if (props) {
      const iso = props.iso_3166_2 || '';
      const name = props.name || '';
      if (iso) isoCounts[iso] = (isoCounts[iso] || 0) + 1;
      if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
  }

  const result: NERegionFeature[] = [];
  const seenIds = new Set<string>();

  for (const f of features) {
    const props = f.properties;
    const iso = props?.iso_3166_2 || '';
    const name = props?.name || 'Unknown';
    const typeEn = props?.type_en || '';

    const hasIsoDuplicate = iso && (isoCounts[iso] > 1);
    const hasNameDuplicate = name && (nameCounts[name] > 1);

    let regionId = iso || `${countryA3}-${slugify(name)}`;
    let displayName = name;

    if ((hasIsoDuplicate || hasNameDuplicate) && typeEn) {
      displayName = `${name} (${typeEn})`;
      regionId = `${regionId}-${slugify(typeEn)}`;
    }

    if (seenIds.has(regionId)) continue;
    seenIds.add(regionId);

    result.push({ regionId, displayName, feature: f });
  }

  result.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return result;
}

export function computeBBoxFromFeatures(features: NEFeature[]): BBox | null {
  if (features.length === 0) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  function processCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [lng, lat] = coords as [number, number];
      if (isFinite(lng) && isFinite(lat)) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      return;
    }
    for (const item of coords) {
      processCoords(item);
    }
  }

  for (const f of features) {
    processCoords(f.geometry.coordinates);
  }

  if (!isFinite(minLng) || !isFinite(maxLng)) return null;

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
    centerLng: (minLng + maxLng) / 2,
    centerLat: (minLat + maxLat) / 2,
  };
}

/**
 * Computes the bounding box of a country's admin-1 geometries.
 * Used for auto-centering and auto-zooming the map.
 */
export async function computeBoundingBox(countryA3: string): Promise<BBox | null> {
  if (countryBBoxCache[countryA3]) return countryBBoxCache[countryA3];
  if (countryA3 === 'SOL') {
    const bbox = { minLng: 42.5, maxLng: 49.0, minLat: 7.9, maxLat: 11.5, centerLng: 45.75, centerLat: 9.7 };
    countryBBoxCache[countryA3] = bbox;
    return bbox;
  }

  const data = await fetchNEAdmin1();
  if (!data) return null;

  const features = getCountryMainlandFeatures(countryA3, data);

  if (features.length === 0) return null;

  const bbox = computeBBoxFromFeatures(features);
  if (bbox) countryBBoxCache[countryA3] = bbox;
  return bbox;
}

/**
 * Returns preloaded GeoJSON and BBox synchronously if the NE dataset is in memory.
 */
export function getPreloadedCountryDataSync(countryA3: string): { geoJson: NEFeatureCollection; bbox: BBox } | null {
  if (countryA3 === 'SOL') {
    return {
      geoJson: SOMALILAND_SUBREGIONS_GEOJSON,
      bbox: { minLng: 42.5, maxLng: 49.0, minLat: 7.9, maxLat: 11.5, centerLng: 45.75, centerLat: 9.7 }
    };
  }
  if (countryGeoCache[countryA3] && countryBBoxCache[countryA3]) {
    return {
      geoJson: countryGeoCache[countryA3],
      bbox: countryBBoxCache[countryA3]
    };
  }
  if (!cachedData) return null;
  const features = getCountryMainlandFeatures(countryA3, cachedData);
  if (features.length === 0) return null;
  const geoJson: NEFeatureCollection = { type: 'FeatureCollection', features };
  const bbox = computeBBoxFromFeatures(features);
  if (!bbox) return null;
  countryGeoCache[countryA3] = geoJson;
  countryBBoxCache[countryA3] = bbox;
  return { geoJson, bbox };
}

/**
 * Checks whether the NE dataset has admin-1 subdivisions for a country.
 * Returns true if at least 2 admin-1 features exist (no drill-down for tiny countries).
 */
export async function hasNESubdivisions(countryA3: string): Promise<boolean> {
  const data = await fetchNEAdmin1();
  if (!data) return false;
  return getCountryMainlandFeatures(countryA3, data).length >= 2;
}

/**
 * Returns true if the NE admin-1 data is already cached (loaded).
 */
export function isNEDataLoaded(): boolean {
  return cachedData !== null;
}

/**
 * Synchronous check to see if a country has sub-regions/subdivisions.
 * If data is not yet loaded, uses an optimistic fallback that excludes known microstates.
 * If loaded, scans the features list for matching country features.
 */
export function hasNESubdivisionsSync(countryA3: string): boolean {
  // SOL and XKX use bundled data — always subdivide
  if (countryA3 === 'SOL' || countryA3 === 'XKX') return true;

  if (!cachedData) {
    const KNOWN_NO_SUBDIVISIONS = new Set([
      'VAT', 'MCO', 'SMR', 'LIE', 'AND', 'NRU', 'TUV', 'SGP', 'MLT',
      'HKG', 'MAC', 'GIB', 'BRB', 'ATG', 'KNA', 'GRD', 'VCT', 'LCA',
      'BHR'
    ]);
    return !KNOWN_NO_SUBDIVISIONS.has(countryA3);
  }
  return getCountryMainlandFeatures(countryA3, cachedData).length >= 2;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Create a URL-safe slug from a region name for fallback IDs. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FALLBACK_KOSOVO_FEATURE: NEFeature = {
  type: 'Feature',
  id: 'XKX',
  properties: {
    ISO_A3: 'XKX',
    iso_a3: 'XKX',
    name: 'Kosovo',
    admin: 'Kosovo'
  },
  geometry: {
    // Exact 110m Natural Earth topology ring matching world-atlas@2.0.2 (clockwise for D3)
    type: 'Polygon',
    coordinates: [[
      [21.5768, 42.2451],
      [21.3536, 42.2062],
      [20.7632, 42.0522],
      [20.7164, 41.8474],
      [20.5904, 41.8559],
      [20.522, 42.2181],
      [20.2844, 42.3196],
      [20.072, 42.5887],
      [20.2592, 42.8122],
      [20.4968, 42.8849],
      [20.6336, 43.2167],
      [20.8136, 43.2725],
      [20.9576, 43.1304],
      [21.1448, 43.0694],
      [21.2744, 42.9103],
      [21.44, 42.8629],
      [21.6344, 42.6767],
      [21.7748, 42.6835],
      [21.6632, 42.4398],
      [21.5444, 42.3196],
      [21.5768, 42.2451]
    ]]
  }
} as unknown as NEFeature;

/**
 * Returns Kosovo's country polygon for the main world map.
 * Uses a single clean outline rather than merged admin-1 sub-regions
 * to avoid rendering internal district boundaries on the world view.
 */
export function getKosovoWorldFeature(): NEFeature {
  return FALLBACK_KOSOVO_FEATURE;
}

// Somaliland boundary decoded from exact 110m world-atlas@2.0.2 topology arcs [~114, ~580, ~582, 583]
const FALLBACK_SOMALILAND_FEATURE: NEFeature = {
  type: 'Feature',
  id: 'SOL',
  properties: {
    ISO_A3: 'SOL',
    iso_a3: 'SOL',
    name: 'Somaliland',
    admin: 'Somaliland'
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      // arc 114 reversed — eastern border (NE tip → Ethiopia tripoint)
      [48.94788948, 11.41011393], // NE tip (shared with Somalia arc 115)
      [48.94068941, 11.3948809],
      [48.93708937, 10.9818966],
      [48.93708937, 9.97313167],
      [48.93708937, 9.45182362],
      [48.48708487, 8.83742485],
      [47.78867789, 8.00299346], // Ethiopia tripoint
      // arc 580 reversed — Ethiopia border (→ northwest)
      [46.9498695, 7.99622322],
      [43.67743677, 9.18439936],
      [43.29583296, 9.53983667],
      [42.92862929, 10.02221587],
      [42.55782558, 10.57229742],
      [42.77742777, 10.92604217], // Djibouti/Ethiopia tripoint
      // arc 582 reversed — Djibouti border
      [43.14463145, 11.46258324], // Djibouti tripoint
      // arc 583 — Gulf of Aden coastline (west → east, exact 110m vertices)
      [43.47223472, 11.27809436],
      [43.66663667, 10.8634175],
      [44.11664117, 10.44535552],
      [44.61344613, 10.44197041],
      [45.55665557, 10.69754675],
      [46.64386644, 10.81602586],
      [47.52587526, 11.12745664],
      [48.02268023, 11.19346643],
      [48.37908379, 11.37626275],
      [48.94788948, 11.41011393]  // close (back to NE tip)
    ]]
  }
} as unknown as NEFeature;


/**
 * Returns Somaliland's country polygon for search-pan centroid computation.
 * On the world map, the actual rendered geometry comes from the 110m topology
 * (tagged with SOL id at decode time in useDrilldownGeography).
 */
export function getSomalilandWorldFeature(): NEFeature {
  return FALLBACK_SOMALILAND_FEATURE;
}

/**
 * Somaliland's 6 administrative sub-regions GeoJSON for interactive map drill-down.
 *
 * Northern coastline uses exact 110m arc 583 vertices from world-atlas@2.0.2.
 * Interior dividers pass through arc 583 coast points so regions tile seamlessly.
 *
 * Coastline (arc 583, west → east, indices C0–C10):
 *   C0  [43.14463145, 11.46258324]  Djibouti tripoint
 *   C1  [43.47223472, 11.27809436]
 *   C2  [43.66663667, 10.8634175]
 *   C3  [44.11664117, 10.44535552]  ← Awdal/Sahil+WO divider meets coast
 *   C4  [44.61344613, 10.44197041]
 *   C5  [45.55665557, 10.69754675]  ← Sahil/Togdheer+Sanaag divider meets coast
 *   C6  [46.64386644, 10.81602586]  ← Togdheer+Sanaag/Sool divider meets coast
 *   C7  [47.52587526, 11.12745664]
 *   C8  [48.02268023, 11.19346643]
 *   C9  [48.37908379, 11.37626275]
 *   C10 [48.94788948, 11.41011393]  NE tip
 *
 * Interior junction points (on Ethiopia border / arc 580):
 *   E0  [47.78867789, 8.00299346]   Ethiopia tripoint (arc 114[0])
 */
export const SOMALILAND_SUBREGIONS_GEOJSON: NEFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { iso_3166_2: 'SOL-AW', name: 'Awdal', adm0_a3: 'SOL', type_en: 'Region', admin: 'Somaliland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [43.14463145, 11.46258324],
          [43.47223472, 11.27809436],
          [43.66663667, 10.8634175],
          [44.0, 10.4145],
          [44.0, 9.0],
          [43.67743677, 9.18439936],
          [43.29583296, 9.53983667],
          [42.92862929, 10.02221587],
          [42.55782558, 10.57229742],
          [42.77742777, 10.92604217],
          [43.14463145, 11.46258324]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { iso_3166_2: 'SOL-SH', name: 'Sahil', adm0_a3: 'SOL', type_en: 'Region', admin: 'Somaliland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [44.0, 10.4145],
          [44.11664117, 10.44535552],
          [44.61344613, 10.44197041],
          [45.55665557, 10.69754675],
          [46.2, 10.75],
          [46.2, 10.2],
          [45.2, 10.2],
          [44.0, 10.2],
          [44.0, 10.4145]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { iso_3166_2: 'SOL-WO', name: 'Maroodi Jeex (Woqooyi Galbeed)', adm0_a3: 'SOL', type_en: 'Region', admin: 'Somaliland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [44.0, 10.2],
          [45.2, 10.2],
          [45.2, 8.6121],
          [44.633, 8.7857],
          [44.0, 9.0],
          [44.0, 10.2]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { iso_3166_2: 'SOL-TO', name: 'Togdheer', adm0_a3: 'SOL', type_en: 'Region', admin: 'Somaliland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [45.2, 10.2],
          [46.2, 10.2],
          [46.8, 10.0],
          [46.8, 8.05],
          [46.1019, 8.2997],
          [45.5144, 8.4965],
          [45.2, 8.6121],
          [45.2, 10.2]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { iso_3166_2: 'SOL-SA', name: 'Sanaag', adm0_a3: 'SOL', type_en: 'Region', admin: 'Somaliland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [46.2, 10.75],
          [46.64386644, 10.81602586],
          [47.52587526, 11.12745664],
          [48.02268023, 11.19346643],
          [48.37908379, 11.37626275],
          [48.94788948, 11.41011393],
          [48.94068941, 11.3948809],
          [48.93708937, 10.9818966],
          [48.93708937, 10.0],
          [46.8, 10.0],
          [46.2, 10.2],
          [46.2, 10.75]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { iso_3166_2: 'SOL-SO', name: 'Sool', adm0_a3: 'SOL', type_en: 'Region', admin: 'Somaliland' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [46.8, 10.0],
          [48.93708937, 10.0],
          [48.93708937, 9.45182362],
          [48.48708487, 8.83742485],
          [47.78867789, 8.00299346],
          [46.9498695, 7.99622322],
          [46.8, 8.05],
          [46.8, 10.0]
        ]]
      }
    }
  ]
};
