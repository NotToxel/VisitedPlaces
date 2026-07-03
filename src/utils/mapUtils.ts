import { UI_COLORS } from '../config/colors';
import type { PlaceStatus } from '../store/useStore';
import { UK_TERRITORIES, USA_TERRITORIES } from '../data/mapData';
import { COUNTRIES } from '../data/countries';

const US_FIPS_TO_ABBR: Record<string, string> = {
  '01': 'al', '02': 'ak', '04': 'az', '05': 'ar', '06': 'ca', '08': 'co', '09': 'ct',
  '10': 'de', '11': 'dc', '12': 'fl', '13': 'ga', '15': 'hi', '16': 'id', '17': 'il',
  '18': 'in', '19': 'ia', '20': 'ks', '21': 'ky', '22': 'la', '23': 'me', '24': 'md',
  '25': 'ma', '26': 'mi', '27': 'mn', '28': 'ms', '29': 'mo', '30': 'mt', '31': 'ne',
  '32': 'nv', '33': 'nh', '34': 'nj', '35': 'nm', '36': 'ny', '37': 'nc', '38': 'nd',
  '39': 'oh', '40': 'ok', '41': 'or', '42': 'pa', '44': 'ri', '45': 'sc', '46': 'sd',
  '47': 'tn', '48': 'tx', '49': 'ut', '50': 'vt', '51': 'va', '53': 'wa', '54': 'wv',
  '55': 'wi', '56': 'wy'
};

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

export const hideMapTooltip = () => {
  const el = document.getElementById('map-tooltip');
  if (el) {
    el.style.opacity = '0';
  }
};

export const getPlaceFlagUrl = (placeId: string): string | null => {
  if (!placeId) return null;

  // 1. Check if it's a standard country ID
  const country = COUNTRIES.find((c) => c.id === placeId);
  if (country && country.flag) {
    return country.flag;
  }

  // 2. Check if it's a USA sub-region (e.g. USA-06, USA-72)
  if (placeId.startsWith('USA-')) {
    const subId = placeId.substring(4);
    
    // Check if it's a territory in USA_TERRITORIES
    const territory = USA_TERRITORIES.find((t) => t.id === placeId);
    if (territory && territory.flagCode) {
      return `https://flagcdn.com/${territory.flagCode}.svg`;
    }

    // Map state FIPS code (padded to 2 digits)
    const normalizedFips = subId.padStart(2, '0');
    const stateAbbr = US_FIPS_TO_ABBR[normalizedFips];
    if (stateAbbr) {
      return `https://flagcdn.com/us-${stateAbbr}.svg`;
    }
  }

  // 3. Check if it's a GBR sub-region (e.g. GBR-E06000001, GBR-JEY)
  if (placeId.startsWith('GBR-')) {
    const subId = placeId.substring(4);
    
    // Check if it's a territory in UK_TERRITORIES
    const territory = UK_TERRITORIES.find((t) => t.id === placeId);
    if (territory && territory.flagCode) {
      return `https://flagcdn.com/${territory.flagCode}.svg`;
    }

    // Check UK national flags: E (England), S (Scotland), W (Wales), N (Northern Ireland)
    const prefix = subId.charAt(0).toUpperCase();
    if (prefix === 'E') return 'https://flagcdn.com/gb-eng.svg';
    if (prefix === 'S') return 'https://flagcdn.com/gb-sct.svg';
    if (prefix === 'W') return 'https://flagcdn.com/gb-wls.svg';
    if (prefix === 'N') return 'https://flagcdn.com/gb-nir.svg';
  }

  return null;
};
