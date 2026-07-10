// Tiered sub-region data resolution:
// 1. Check drilldownRegistry for curated TopoJSON (USA, GBR)
// 2. Fall back to Natural Earth admin-1 GeoJSON for all other countries

import { drilldownRegistry } from '../config/drilldownConfig';
import type { TopologyData, TopologyGeometry } from '../config/drilldownConfig';
import { getCountryRegions, hasNESubdivisionsSync } from '../data/naturalEarthAdmin1';
import { getTerritoriesForCountry } from '../data/territoriesRegistry';
import { getCleanGbrName } from '../data/gbrRegionData';

export interface TopoRegion {
  id: string;     // Canonical store key: "{PARENT_A3}-{LOCAL_ID}"
  name: string;   // Display name
}

const subRegionCache: Record<string, TopoRegion[]> = {};
const pendingRequests: Record<string, Promise<TopoRegion[]>> = {};

/**
 * Returns the TopoJSON CDN URL for countries with curated overrides,
 * or null for countries that should use the NE admin-1 baseline.
 */
export const getSubRegionUrl = (countryA3: string): string | null => {
  const config = drilldownRegistry[countryA3];
  return config?.topoJsonUrl || null;
};

/**
 * Returns true if a country has drill-down support (either via curated
 * override or via the NE admin-1 baseline).
 * For NE baseline, this does a quick synchronous check — if NE data
 * hasn't loaded yet, it optimistically returns true (since most countries
 * have admin-1 data). The actual data is validated at render time.
 */
export const hasDrilldownSupport = (countryA3: string): boolean => {
  if (countryA3.includes('-')) return false;
  return hasNESubdivisionsSync(countryA3);
};

/**
 * Fetches the list of sub-regions for a country.
 * Uses curated TopoJSON for override countries, NE admin-1 for everything else.
 */
export const fetchSubRegions = async (countryA3: string): Promise<TopoRegion[]> => {
  if (subRegionCache[countryA3]) return subRegionCache[countryA3];
  if (pendingRequests[countryA3] !== undefined) return await pendingRequests[countryA3];

  const config = drilldownRegistry[countryA3];

  const fetchPromise = config
    ? fetchCuratedSubRegions(countryA3, config.topoJsonUrl)
    : fetchNESubRegions(countryA3);

  pendingRequests[countryA3] = fetchPromise;

  const result = await fetchPromise;
  delete pendingRequests[countryA3];
  return result;
};

// ── Curated TopoJSON fetching (USA, GBR) ──────────────────────────────────

async function fetchCuratedSubRegions(countryA3: string, url: string): Promise<TopoRegion[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch topology for ${countryA3}`);
    const data = await res.json() as TopologyData;

    if (!data.objects) throw new Error('Invalid topojson structure');

    let regions: TopoRegion[] = [];
    const config = drilldownRegistry[countryA3];

    // Process through the config's processTopology if available
    const processed = config?.processTopology ? config.processTopology(JSON.parse(JSON.stringify(data))) : data;

    // Find the first object layer
    const objectKey = Object.keys(processed.objects)[0];
    if (!objectKey) return [];

    const geometries = processed.objects[objectKey].geometries;

    regions = geometries.map((g: TopologyGeometry) => {
      let localId: string;
      if (config?.regionIdExtractor) {
        localId = config.regionIdExtractor(g);
      } else {
        localId = (g.id?.toString() || '');
      }

      let name = (g.properties?.name || g.properties?.AREANM || g.properties?.areanm || localId).toString();
      if (name === 'Commonwealth of the Northern Mariana Islands') {
        name = 'Northern Mariana Islands';
      }
      if (countryA3 === 'GBR') {
        name = getCleanGbrName(name);
      }

      return {
        id: `${countryA3}-${localId}`,
        name,
      };
    });

    // Inject territories from the registry
    const territories = getTerritoriesForCountry(countryA3);
    territories.forEach((t) => {
      if (!regions.some((r) => r.id === t.id)) {
        regions.push({ id: t.id, name: t.name });
      }
    });

    regions.sort((a, b) => a.name.localeCompare(b.name));
    subRegionCache[countryA3] = regions;
    return regions;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ── Natural Earth admin-1 fetching (all other countries) ──────────────────

async function fetchNESubRegions(countryA3: string): Promise<TopoRegion[]> {
  try {
    const neRegions = await getCountryRegions(countryA3);

    const regions: TopoRegion[] = neRegions.map((r) => ({
      id: `${countryA3}-${r.iso_3166_2}`,
      name: r.name,
    }));

    // Inject territories from the registry
    const territories = getTerritoriesForCountry(countryA3);
    territories.forEach((t) => {
      if (!regions.some((r) => r.id === t.id)) {
        regions.push({ id: t.id, name: t.name });
      }
    });

    regions.sort((a, b) => a.name.localeCompare(b.name));
    subRegionCache[countryA3] = regions;
    return regions;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ── Raw topology cache (for map rendering) ────────────────────────────────

const rawTopologyCache: Record<string, unknown> = {};
const pendingTopologyRequests: Record<string, Promise<unknown>> = {};

export const fetchRawTopology = async (url: string): Promise<unknown> => {
  if (rawTopologyCache[url]) return rawTopologyCache[url];
  if (pendingTopologyRequests[url] !== undefined) return pendingTopologyRequests[url];

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch raw topology from ${url}`);
      return res.json();
    })
    .then((data) => {
      rawTopologyCache[url] = data;
      return data;
    })
    .catch((err) => {
      console.error(err);
      return null;
    })
    .finally(() => {
      delete pendingTopologyRequests[url];
    });

  pendingTopologyRequests[url] = promise;
  return promise;
};
