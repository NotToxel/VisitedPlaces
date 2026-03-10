import { UI_COLORS } from '../config/constants';
import type { PlaceStatus } from '../store/useStore';

/**
 * Determines the SVG fill color for a geography path based on its status and map context.
 */
export const getFillColor = (
  status: PlaceStatus, 
  isHighlighted: boolean, 
  isSubRegion: boolean = false,
  showVisited: boolean = true,
  showWishlist: boolean = true,
  showAvoid: boolean = true
): string => {
  if (isHighlighted) return UI_COLORS.mapFillHover;
  if (status === 'VISITED' && showVisited) return UI_COLORS.visited;
  if (status === 'WISHLIST' && showWishlist) return UI_COLORS.wishlist;
  if (status === 'AVOID' && showAvoid) return UI_COLORS.avoid;
  return isSubRegion ? UI_COLORS.mapFillHover : UI_COLORS.mapFillUnselected;
};

/**
 * Normalizes TopoJSON IDs (which might be raw strings, CCN3 numeric codes, or region specific codes)
 * into the standard ISO A3 format `USA`, `GBR`, or locally prefixed formats like `USA-72`.
 */
export const getRegionId = (
  geo: any, 
  numericToA3: Record<string, string>, 
  activeCountry: string | null
): string => {
  if (activeCountry === 'GBR') {
     const rawId = geo.properties?.AREACD || geo.properties?.areacd || geo.id;
     return `GBR-${rawId}`;
  }
  if (activeCountry === 'USA') {
     return `USA-${geo.id}`;
  }
  const rawId = geo.properties?.ISO_A3 || geo.id;
  return numericToA3[rawId] || rawId;
};
