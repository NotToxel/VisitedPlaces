import { UI_COLORS } from '../config/constants';
import type { PlaceStatus } from '../store/useStore';

export interface GeoProperties {
  AREACD?: string;
  areacd?: string;
  ISO_A3?: string;
  iso_a3?: string;
  cca3?: string;
  name?: string;
  AREANM?: string;
  areanm?: string;
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
 * Normalizes TopoJSON IDs (which might be raw strings, CCN3 numeric codes, or region specific codes)
 * into the standard ISO A3 format `USA`, `GBR`, or locally prefixed formats like `USA-72`.
 */
export const getRegionId = (
  geo: GeoFeature, 
  numericToA3: Record<string, string>, 
  activeCountry: string | null
): string => {
  if (activeCountry === 'GBR') {
     const rawId = geo.properties?.AREACD || geo.properties?.areacd || geo.id?.toString() || '';
     return `GBR-${rawId}`;
  }
  if (activeCountry === 'USA') {
     return `USA-${geo.id?.toString() || ''}`;
  }
  const rawId = geo.properties?.ISO_A3 || geo.id?.toString() || '';
  return numericToA3[rawId] || rawId;
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

/**
 * Direct DOM helper to hide the high-performance floating tooltip.
 */
export const hideMapTooltip = () => {
  const el = document.getElementById('map-tooltip');
  if (el) {
    el.style.opacity = '0';
  }
};
