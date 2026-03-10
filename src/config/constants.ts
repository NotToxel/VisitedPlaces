// API Endpoints
export const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,ccn3,flags,region,subregion';
export const WORLD_GEO_URL = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

// Shared Colors (Mirrors CSS variables but accessible to JS/Canvas plugins)
export const UI_COLORS = {
  visited: 'var(--accent-visited)',
  wishlist: 'var(--accent-wishlist)',
  avoid: 'var(--accent-avoid)',
  highlightStroke: 'var(--accent-highlight)',
  mapFillUnselected: 'var(--map-fill-unselected)',
  mapFillHover: 'var(--map-fill-hover)',
  mapStroke: 'var(--map-stroke)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
};

// Map Animation & Viewport Defaults
export const MAP_DEFAULTS = {
  worldCenter: [0, 0] as [number, number],
  worldZoom: 1,
  usaCenter: [-97, 38] as [number, number],
  usaZoom: 1,
  gbrCenter: [-3, 54.5] as [number, number],
  gbrZoom: 0.6,
  minZoom: 0.5,
  maxZoom: 24,
};
