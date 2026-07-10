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

// ── In-memory cache ───────────────────────────────────────────────────────

let cachedData: NEFeatureCollection | null = null;
let pendingFetch: Promise<NEFeatureCollection | null> | null = null;

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
    (f) => (f.properties?.adm0_a3 === countryA3 ||
           (countryA3 === 'GBR' && f.properties?.adm0_a3 === 'IMN')) &&
           f.properties?.name !== null &&
           f.properties?.name !== undefined &&
           f.properties?.name !== ''
  );

  if (countryA3 === 'FRA') {
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
  } else if (countryA3 === 'RUS' || countryA3 === 'NZL') {
    // Russia and New Zealand span the antimeridian.
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
  const data = await fetchNEAdmin1();
  if (!data) return null;

  const features = getCountryMainlandFeatures(countryA3, data);

  if (features.length === 0) return null;

  return {
    type: 'FeatureCollection',
    features,
  };
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

  // Get ALL features for this country (no mainland filtering)
  const features = data.features.filter(
    (f) => f.properties?.adm0_a3 === countryA3
  );

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

/**
 * Computes the bounding box of a country's admin-1 geometries.
 * Used for auto-centering and auto-zooming the map.
 */
export async function computeBoundingBox(countryA3: string): Promise<BBox | null> {
  const data = await fetchNEAdmin1();
  if (!data) return null;

  const features = getCountryMainlandFeatures(countryA3, data);

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
 * Checks whether the NE dataset has admin-1 subdivisions for a country.
 * Returns true if at least 2 admin-1 features exist (no drill-down for tiny countries).
 */
export async function hasNESubdivisions(countryA3: string): Promise<boolean> {
  const data = await fetchNEAdmin1();
  if (!data) return false;

  let count = 0;
  for (const f of data.features) {
    if (f.properties?.adm0_a3 === countryA3 &&
        f.properties?.name !== null &&
        f.properties?.name !== undefined &&
        f.properties?.name !== '') {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
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
  if (!cachedData) {
    const KNOWN_NO_SUBDIVISIONS = new Set([
      'VAT', 'MCO', 'SMR', 'LIE', 'AND', 'NRU', 'TUV', 'SGP', 'MLT',
      'HKG', 'MAC', 'GIB', 'BRB', 'ATG', 'KNA', 'GRD', 'VCT', 'LCA',
      'BHR'
    ]);
    return !KNOWN_NO_SUBDIVISIONS.has(countryA3);
  }

  let count = 0;
  for (const f of cachedData.features) {
    if (f.properties?.adm0_a3 === countryA3 &&
        f.properties?.name !== null &&
        f.properties?.name !== undefined &&
        f.properties?.name !== '') {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
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
