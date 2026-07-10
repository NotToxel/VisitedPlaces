// Centralized flag URL resolution for countries and sub-regions.
// Country flags: flagcdn.com (existing pattern)
// Regional flags: iso3166-flags via jsDelivr CDN
// Fallback: country flag if regional flag is missing

import { ISO3166_FLAGS_BASE } from '../config/urls';
import { COUNTRIES } from '../data/countries';
import { getAllTerritories } from '../data/territoriesRegistry';
import { getGbrIsoCode } from '../data/gbrRegionData';

/**
 * Returns the flag URL for a sub-region given its ISO 3166-2 code.
 * Example: "US-CA" → ".../iso3166-2-flags/US/US-CA.svg"
 */
export function getRegionFlagUrl(iso3166_2: string): string {
  const dashIndex = iso3166_2.indexOf('-');
  if (dashIndex === -1) return '';
  const countryPart = iso3166_2.substring(0, dashIndex);
  return `${ISO3166_FLAGS_BASE}/${countryPart}/${iso3166_2}.svg`;
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
export function getPlaceFlagUrl(placeId: string): string | null {
  if (!placeId) return null;

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

  // 2b. GBR curated drill-down: ONS codes → ISO 3166-2 → flag CDN
  if (placeId.startsWith('GBR-')) {
    const onsCode = placeId.substring(4);
    const isoCode = getGbrIsoCode(onsCode);
    if (isoCode) {
      return getRegionFlagUrl(isoCode);
    }
  }

  // 3. It's a sub-region — extract the ISO 3166-2 portion
  // Format: "{PARENT_A3}-{ISO_3166_2}" e.g., "USA-US-CA" → iso3166_2 = "US-CA"
  const parentEnd = 3; // ISO-A3 is always 3 characters
  if (placeId.length > parentEnd + 1 && placeId[parentEnd] === '-') {
    const iso3166_2 = placeId.substring(parentEnd + 1);
    // If it looks like an ISO 3166-2 code (has a dash), try the regional flag
    if (iso3166_2.includes('-')) {
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
