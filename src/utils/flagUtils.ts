// Centralized flag URL resolution for countries and sub-regions.
// Country flags: flagcdn.com (existing pattern)
// Regional flags: iso3166-flags via jsDelivr CDN
// Fallback: country flag if regional flag is missing

import { ISO3166_FLAGS_BASE } from '../config/urls';
import { COUNTRIES } from '../data/countries';
import { getAllTerritories } from '../data/territoriesRegistry';
import { REGION_FLAG_REGISTRY } from '../data/regionFlagRegistry';

/**
 * Returns the flag URL for a sub-region given its ISO 3166-2 code.
 * Example: "US-CA" → ".../iso3166-2-flags/US/US-CA.svg"
 */
export function getRegionFlagUrl(iso3166_2: string): string {
  const dashIndex = iso3166_2.indexOf('-');
  if (dashIndex === -1) return '';
  const countryPart = iso3166_2.substring(0, dashIndex);
  
  const ext = REGION_FLAG_REGISTRY[iso3166_2] || 'svg';
  
  return `${ISO3166_FLAGS_BASE}/${countryPart}/${iso3166_2}.${ext}`;
}

/**
 * Returns the flag URL for a country given its ISO-A2 code.
 */
export function getCountryFlagUrl(cca2: string): string {
  return `https://flagcdn.com/${cca2.toLowerCase()}.svg`;
}

/**
 * Returns a primary regional flag URL and a fallback country flag URL.
 * Components should use `onError` on the <img> to swap to the fallback.
 */
export function getRegionFlagWithFallback(
  iso3166_2: string,
  countryCca2: string
): { primary: string; fallback: string } {
  return {
    primary: getRegionFlagUrl(iso3166_2),
    fallback: getCountryFlagUrl(countryCca2),
  };
}

/**
 * Universal flag resolver — replaces the old `getPlaceFlagUrl` in mapUtils.ts.
 * Handles country IDs, territory IDs, and region IDs.
 *
 * Place ID formats:
 * - Country: "USA", "GBR", "FRA"
 * - Territory: "GBR-GI", "USA-PR", "FRA-GP" (parent-territory, matches territory registry)
 * - Sub-region: "USA-US-CA", "FRA-FR-ARA" (parent-iso3166_2)
 */
// In-memory cache of resolved blob URLs (placeId -> blobUrl)
export const resolvedBlobUrlCache = new Map<string, string>();
const activeFetches = new Map<string, Promise<string>>();
const FLAG_CACHE_NAME = 'visited-places-flags-cache-v1';

/**
 * Fetches the flag image, caches it in CacheStorage, and returns a local blob URL.
 */
export async function fetchFlagAsBlobUrl(placeId: string, url: string): Promise<string> {
  if (typeof window === 'undefined') return url;

  // 1. Check in-memory cache first
  if (resolvedBlobUrlCache.has(placeId)) {
    return resolvedBlobUrlCache.get(placeId)!;
  }

  // 2. Check if there's an active fetch for this place ID
  if (activeFetches.has(placeId)) {
    return activeFetches.get(placeId)!;
  }

  const fetchPromise = (async () => {
    try {
      const hasCache = 'caches' in window;
      let response: Response | undefined;

      if (hasCache) {
        try {
          const cache = await caches.open(FLAG_CACHE_NAME);
          const cachedResponse = await cache.match(url);
          if (cachedResponse) {
            response = cachedResponse;
          }
        } catch (err) {
          console.warn('Cache Storage match failed:', err);
        }
      }

      if (!response) {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        if (hasCache) {
          try {
            const cache = await caches.open(FLAG_CACHE_NAME);
            await cache.put(url, res.clone());
          } catch (err) {
            console.warn('Cache Storage put failed:', err);
          }
        }
        response = res;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      resolvedBlobUrlCache.set(placeId, blobUrl);
      return blobUrl;
    } catch (error) {
      console.warn(`Error caching flag for ${placeId} from ${url}:`, error);
      return url; // Fallback: return the original URL on failure
    } finally {
      activeFetches.delete(placeId);
    }
  })();

  activeFetches.set(placeId, fetchPromise);
  return fetchPromise;
}

export function getPlaceFlagUrl(placeId: string): string | null {
  if (!placeId) return null;

  // Check if we already have the blob URL cached
  if (resolvedBlobUrlCache.has(placeId)) {
    return resolvedBlobUrlCache.get(placeId)!;
  }

  // 1. Check if it's a standard country ID (no dash)
  if (!placeId.includes('-')) {
    const country = COUNTRIES.find((c) => c.id === placeId);
    if (country?.flag) return country.flag;
    return null;
  }

  // 2. Check if it's an overseas territory
  const allTerritories = getAllTerritories();
  const territory = allTerritories.find((t) => t.id === placeId);
  if (territory) {
    return `https://flagcdn.com/${territory.flagCode}.svg`;
  }

  // 3. It's a sub-region — extract the ISO 3166-2 portion
  // Format: "{PARENT_A3}-{ISO_3166_2}" e.g., "USA-US-CA" → iso3166_2 = "US-CA"
  const parentEnd = 3; // ISO-A3 is always 3 characters
  if (placeId.length > parentEnd + 1 && placeId[parentEnd] === '-') {
    const iso3166_2 = placeId.substring(parentEnd + 1);
    // If it looks like an ISO 3166-2 code (has a dash), try the regional flag
    if (iso3166_2.includes('-')) {
      // If the region code is not in the availability registry, skip CDN request entirely
      if (!REGION_FLAG_REGISTRY[iso3166_2]) {
        const parentA3 = placeId.substring(0, 3);
        const parentCountry = COUNTRIES.find((c) => c.id === parentA3);
        return parentCountry?.flag || null;
      }
      
      return getRegionFlagUrl(iso3166_2);
    }
  }

  // 4. Fallback: try to find the parent country flag
  const parentA3 = placeId.substring(0, 3);
  const parentCountry = COUNTRIES.find((c) => c.id === parentA3);
  if (parentCountry?.flag) return parentCountry.flag;

  return null;
}

/**
 * Returns the country flag URL for the parent of a given place ID.
 * Useful as a fallback when the regional flag fails to load.
 */
export function getParentCountryFlagUrl(placeId: string): string | null {
  const parentA3 = placeId.substring(0, 3);
  const country = COUNTRIES.find((c) => c.id === parentA3);
  return country?.flag || null;
}

/**
 * Preloads flag images in the background for a list of place IDs.
 * Uses getPlaceFlagUrl and schedules loading during browser idle periods.
 */
export function preloadPlaceFlags(placeIds: string[]): void {
  if (typeof window === 'undefined') return;

  const startPreload = () => {
    placeIds.forEach((id) => {
      const url = getPlaceFlagUrl(id);
      if (url && !resolvedBlobUrlCache.has(id)) {
        fetchFlagAsBlobUrl(id, url).catch(() => {});
      }
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => startPreload(), { timeout: 2000 });
  } else {
    setTimeout(startPreload, 200);
  }
}
