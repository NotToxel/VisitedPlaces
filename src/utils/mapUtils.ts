import { UI_COLORS } from '../config/colors';
import type { PlaceStatus } from '../store/useStore';
import { getPlaceFlagUrl as getFlagUrl } from './flagUtils';

export interface GeoProperties {
  AREACD?: string;
  areacd?: string;
  ISO_A3?: string;
  iso_a3?: string;
  iso_3166_2?: string;
  cca3?: string;
  name?: string;
  AREANM?: string;
  areanm?: string;
  adm0_a3?: string;
  type_en?: string;
}

export interface GeoFeature {
  id: string | number;
  properties?: GeoProperties;
}

/**
 * Determines the SVG fill color for a geography path based on its status and map context.
 */
export const getFillColor = (
  status: PlaceStatus, 
  isHighlighted: boolean, 
  isSubRegion: boolean = false,
  showVisited: boolean = true,
  showWishlist: boolean = true,
  showAvoid: boolean = true,
  showRevisit: boolean = true
): string => {
  if (status === 'VISITED' && showVisited) return UI_COLORS.visited;
  if (status === 'REVISIT' && showRevisit) return UI_COLORS.revisit;
  if (status === 'WISHLIST' && showWishlist) return UI_COLORS.wishlist;
  if (status === 'AVOID' && showAvoid) return UI_COLORS.avoid;
  if (isHighlighted) return UI_COLORS.mapFillHover;
  return isSubRegion ? UI_COLORS.mapFillHover : UI_COLORS.mapFillUnselected;
};

/**
 * Normalizes TopoJSON/GeoJSON feature IDs into the store key format.
 *
 * World view: returns ISO-A3 (e.g., "USA", "GBR")
 * Curated drill-down (USA): returns "USA-{FIPS}" (e.g., "USA-06")
 * Curated drill-down (GBR): returns "GBR-{AREACD}" (e.g., "GBR-E06000001")
 * NE admin-1 drill-down: returns "{PARENT}-{ISO_3166_2}" (e.g., "FRA-FR-ARA")
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const getRegionId = (
  geo: GeoFeature, 
  numericToA3: Record<string, string>, 
  activeCountry: string | null,
  duplicateIsos?: Set<string>,
  duplicateNames?: Set<string>
): string => {
  // World view — resolve country ISO-A3
  if (!activeCountry) {
    const rawId = geo.properties?.ISO_A3 || geo.id?.toString() || '';
    return numericToA3[rawId] || rawId;
  }

  // Curated drill-down: GBR
  if (activeCountry === 'GBR') {
    const rawId = geo.properties?.AREACD || geo.properties?.areacd || geo.id?.toString() || '';
    return `GBR-${rawId}`;
  }

  // Curated drill-down: USA
  if (activeCountry === 'USA') {
    return `USA-${geo.id?.toString() || ''}`;
  }

  // NE admin-1 drill-down — use ISO 3166-2 code from NE properties
  const iso3166_2 = geo.properties?.iso_3166_2;
  const name = geo.properties?.name || '';
  const typeEn = geo.properties?.type_en || '';

  if (iso3166_2) {
    let regionId = iso3166_2;
    const hasIsoDuplicate = duplicateIsos?.has(iso3166_2) || false;
    const hasNameDuplicate = name && duplicateNames?.has(name);
    
    if ((hasIsoDuplicate || hasNameDuplicate) && typeEn) {
      regionId = `${regionId}-${slugify(typeEn)}`;
    }
    return `${activeCountry}-${regionId}`;
  }

  // Fallback: use the feature name slugified
  const fallbackName = geo.properties?.name || geo.id?.toString() || '';
  let finalFallback = slugify(fallbackName);
  const hasNameDuplicate = fallbackName && duplicateNames?.has(fallbackName);
  if (hasNameDuplicate && typeEn) {
    finalFallback = `${finalFallback}-${slugify(typeEn)}`;
  }
  return `${activeCountry}-${finalFallback}`;
};

/**
 * Direct DOM helper to display and position the high-performance floating tooltip.
 */
export const showMapTooltip = (content: string, e: React.MouseEvent | MouseEvent) => {
  const el = document.getElementById('map-tooltip');
  if (el) {
    el.textContent = content;
    el.style.left = `${e.clientX + 10}px`;
    el.style.top = `${e.clientY + 12}px`;
    el.style.opacity = '1';
  }
};

export const hideMapTooltip = () => {
  const el = document.getElementById('map-tooltip');
  if (el) {
    el.style.opacity = '0';
  }
};

// Re-export the universal flag resolver from flagUtils
export const getPlaceFlagUrl = getFlagUrl;

export const formatStatusLabel = (status: PlaceStatus): string => {
  if (status === 'NONE') return 'None';
  if (status === 'VISITED') return 'Visited';
  if (status === 'WISHLIST') return 'Wishlist';
  if (status === 'REVISIT') return 'Revisit';
  if (status === 'AVOID') return 'Avoid';
  return status;
};
