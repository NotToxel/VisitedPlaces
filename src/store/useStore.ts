import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Enums and Types
export type PlaceStatus = 'VISITED' | 'WISHLIST' | 'AVOID' | 'REVISIT' | 'NONE';

export interface ResidencyPeriod {
  id: string;
  start: string;
  end?: string;
  current?: boolean;
  note?: string;
}

export interface RegionData {
  [regionCode: string]: PlaceStatus;
}

export interface RegionLivedData {
  [regionCode: string]: boolean;
}

export interface RegionResidencyData {
  [regionCode: string]: ResidencyPeriod[];
}

export interface CountryData {
  status: PlaceStatus;
  lived?: boolean;
  periods?: ResidencyPeriod[];
  regions: RegionData;
  livedRegions?: RegionLivedData;
  regionPeriods?: RegionResidencyData;
}

export interface UserPlacesMap {
  [countryCode: string]: CountryData;
}

export interface AppState {
  // Current user's places
  places: UserPlacesMap;
  theme: 'dark' | 'light';
  livedTrackingEnabled: boolean;
  
  // Actions
  setCountryStatus: (countryCode: string, status: PlaceStatus) => void;
  setRegionStatus: (countryCode: string, regionCode: string, status: PlaceStatus) => void;
  setCountryLived: (countryCode: string, lived: boolean) => void;
  setRegionLived: (countryCode: string, regionCode: string, lived: boolean) => void;
  setCountryPeriods: (countryCode: string, periods: ResidencyPeriod[]) => void;
  setRegionPeriods: (countryCode: string, regionCode: string, periods: ResidencyPeriod[]) => void;
  setLivedTrackingEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
  
  // Load whole state (for sharing / resetting)
  loadPlaces: (places: UserPlacesMap) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      places: {},
      theme: 'light',
      livedTrackingEnabled: false,

      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setLivedTrackingEnabled: (enabled) => set({ livedTrackingEnabled: enabled }),
      
      setCountryStatus: (countryCode, status) => set((state) => {
        const updatedPlaces = { ...state.places };
        
        if (status === 'NONE') {
          const current = updatedPlaces[countryCode];
          if (current?.lived || (current?.periods && current.periods.length > 0)) {
            // Keep place record if lived data exists
            updatedPlaces[countryCode] = {
              ...current,
              status: 'NONE'
            };
          } else {
            delete updatedPlaces[countryCode];
          }
          
          // Sync schemas: if it's a sub-region (contains '-'), also delete it from the parent's regions object
          if (countryCode.includes('-')) {
            const parentCode = countryCode.split('-')[0];
            if (updatedPlaces[parentCode]) {
              const regions = { ...updatedPlaces[parentCode].regions };
              delete regions[countryCode];
              updatedPlaces[parentCode] = {
                ...updatedPlaces[parentCode],
                regions
              };
              // Cleanup parent if it becomes empty and has status NONE and no lived data
              const parent = updatedPlaces[parentCode];
              if (
                parent.status === 'NONE' &&
                !parent.lived &&
                Object.keys(parent.regions).length === 0 &&
                (!parent.livedRegions || Object.keys(parent.livedRegions).length === 0)
              ) {
                delete updatedPlaces[parentCode];
              }
            }
          }
        } else {
          const existing = updatedPlaces[countryCode] || { regions: {} };
          updatedPlaces[countryCode] = {
            ...existing,
            status,
            regions: existing.regions || {}
          };

          // Cascade up: if selecting a subregion, also select the parent
          if (countryCode.includes('-')) {
            const parentCode = countryCode.split('-')[0];
            const currentParentStatus = updatedPlaces[parentCode]?.status || 'NONE';
            
            let parentStatus = currentParentStatus;
            if (status === 'VISITED') {
               parentStatus = 'VISITED';
            } else if (status === 'WISHLIST' && currentParentStatus !== 'VISITED') {
               parentStatus = 'WISHLIST';
            } else if (status === 'AVOID' && currentParentStatus === 'NONE') {
               parentStatus = 'AVOID';
            } else if (status === 'REVISIT' && currentParentStatus !== 'VISITED') {
               parentStatus = 'REVISIT';
            }

            // Sync schemas: also add it to the parent country's nested regions
            const parentCountry = updatedPlaces[parentCode] || { status: 'NONE', regions: {} };
            const parentRegions = { ...(parentCountry.regions || {}) };
            parentRegions[countryCode] = status;

            updatedPlaces[parentCode] = {
              ...parentCountry,
              status: parentStatus,
              regions: parentRegions
            };
          }
        }
        
        return { places: updatedPlaces };
      }),

      setRegionStatus: (countryCode, regionCode, status) => set((state) => {
        const updatedPlaces = { ...state.places };
        
        const country = updatedPlaces[countryCode] || { status: 'NONE', regions: {} };
        const regions = { ...country.regions };
        
        if (status === 'NONE') {
          delete regions[regionCode];
          if (updatedPlaces[regionCode]) {
            if (updatedPlaces[regionCode].lived) {
              updatedPlaces[regionCode] = { ...updatedPlaces[regionCode], status: 'NONE' };
            } else {
              delete updatedPlaces[regionCode];
            }
          }
        } else {
          regions[regionCode] = status;
          // Sync schema: set flat key too
          const existingFlat = updatedPlaces[regionCode] || { regions: {} };
          updatedPlaces[regionCode] = {
            ...existingFlat,
            status,
            regions: existingFlat.regions || {}
          };
        }
        
        let parentStatus = country.status;
        if (status === 'VISITED') {
          parentStatus = 'VISITED';
        } else if (status === 'WISHLIST' && parentStatus !== 'VISITED') {
          parentStatus = 'WISHLIST';
        } else if (status === 'AVOID' && parentStatus === 'NONE') {
          parentStatus = 'AVOID';
        } else if (status === 'REVISIT' && parentStatus !== 'VISITED') {
          parentStatus = 'REVISIT';
        }

        updatedPlaces[countryCode] = {
          ...country,
          status: parentStatus,
          regions
        };
        
        // Cleanup if empty
        if (
          updatedPlaces[countryCode].status === 'NONE' &&
          !updatedPlaces[countryCode].lived &&
          Object.keys(regions).length === 0 &&
          (!updatedPlaces[countryCode].livedRegions || Object.keys(updatedPlaces[countryCode].livedRegions!).length === 0)
        ) {
          delete updatedPlaces[countryCode];
        }
        
        return { places: updatedPlaces };
      }),

      setCountryLived: (countryCode, lived) => set((state) => {
        const updatedPlaces = { ...state.places };
        const existing = updatedPlaces[countryCode] || { status: 'NONE', regions: {} };
        
        updatedPlaces[countryCode] = {
          ...existing,
          lived
        };

        if (countryCode.includes('-')) {
          const parentCode = countryCode.split('-')[0];
          const parent = updatedPlaces[parentCode] || { status: 'NONE', regions: {} };
          const livedRegions = { ...(parent.livedRegions || {}) };
          
          if (lived) {
            livedRegions[countryCode] = true;
            updatedPlaces[parentCode] = {
              ...parent,
              lived: true,
              livedRegions
            };
          } else {
            delete livedRegions[countryCode];
            updatedPlaces[parentCode] = {
              ...parent,
              livedRegions
            };
          }
        }

        // Cleanup if empty
        if (
          !lived &&
          updatedPlaces[countryCode].status === 'NONE' &&
          Object.keys(updatedPlaces[countryCode].regions).length === 0 &&
          (!updatedPlaces[countryCode].livedRegions || Object.keys(updatedPlaces[countryCode].livedRegions!).length === 0)
        ) {
          delete updatedPlaces[countryCode];
        }

        return { places: updatedPlaces };
      }),

      setRegionLived: (countryCode, regionCode, lived) => set((state) => {
        const updatedPlaces = { ...state.places };
        const country = updatedPlaces[countryCode] || { status: 'NONE', regions: {} };
        const livedRegions = { ...(country.livedRegions || {}) };

        if (lived) {
          livedRegions[regionCode] = true;
          updatedPlaces[countryCode] = {
            ...country,
            lived: true,
            livedRegions
          };
        } else {
          delete livedRegions[regionCode];
          updatedPlaces[countryCode] = {
            ...country,
            livedRegions
          };
        }

        // Sync flat region entry
        const existingFlat = updatedPlaces[regionCode] || { status: 'NONE', regions: {} };
        if (lived) {
          updatedPlaces[regionCode] = {
            ...existingFlat,
            lived: true
          };
        } else {
          if (existingFlat.status === 'NONE' && Object.keys(existingFlat.regions).length === 0) {
            delete updatedPlaces[regionCode];
          } else {
            const rest = { ...existingFlat };
            delete rest.lived;
            updatedPlaces[regionCode] = rest;
          }
        }

        return { places: updatedPlaces };
      }),

      setCountryPeriods: (countryCode, periods) => set((state) => {
        const updatedPlaces = { ...state.places };
        const existing = updatedPlaces[countryCode] || { status: 'NONE', regions: {} };
        const lived = periods.length > 0 ? true : existing.lived;

        updatedPlaces[countryCode] = {
          ...existing,
          lived,
          periods: periods.length > 0 ? periods : undefined
        };

        if (countryCode.includes('-')) {
          const parentCode = countryCode.split('-')[0];
          const parent = updatedPlaces[parentCode] || { status: 'NONE', regions: {} };
          const regionPeriods = { ...(parent.regionPeriods || {}) };
          const livedRegions = { ...(parent.livedRegions || {}) };

          if (periods.length > 0) {
            regionPeriods[countryCode] = periods;
            livedRegions[countryCode] = true;
            updatedPlaces[parentCode] = {
              ...parent,
              lived: true,
              regionPeriods,
              livedRegions
            };
          } else {
            delete regionPeriods[countryCode];
            updatedPlaces[parentCode] = {
              ...parent,
              regionPeriods
            };
          }
        }

        return { places: updatedPlaces };
      }),

      setRegionPeriods: (countryCode, regionCode, periods) => set((state) => {
        const updatedPlaces = { ...state.places };
        const country = updatedPlaces[countryCode] || { status: 'NONE', regions: {} };
        const regionPeriods = { ...(country.regionPeriods || {}) };
        const livedRegions = { ...(country.livedRegions || {}) };

        if (periods.length > 0) {
          regionPeriods[regionCode] = periods;
          livedRegions[regionCode] = true;
          updatedPlaces[countryCode] = {
            ...country,
            lived: true,
            livedRegions,
            regionPeriods
          };
        } else {
          delete regionPeriods[regionCode];
          updatedPlaces[countryCode] = {
            ...country,
            regionPeriods
          };
        }

        // Sync flat region entry
        const existingFlat = updatedPlaces[regionCode] || { status: 'NONE', regions: {} };
        updatedPlaces[regionCode] = {
          ...existingFlat,
          lived: periods.length > 0 ? true : existingFlat.lived,
          periods: periods.length > 0 ? periods : undefined
        };

        return { places: updatedPlaces };
      }),
      
      loadPlaces: (places) => set({ places: sanitizePlaces(places) })
    }),
    {
      name: 'visited-places-storage',
      // Persist places, theme, and livedTrackingEnabled in localStorage
      partialize: (state) => ({
        places: state.places,
        theme: state.theme,
        livedTrackingEnabled: state.livedTrackingEnabled,
      } as AppState),
      // Automatically migrate legacy FIPS/ONS keys to ISO 3166-2 on store hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.places) {
          state.places = sanitizePlaces(state.places);
        }
      }
    }
  )
);

function sanitizePeriods(rawPeriods: unknown): ResidencyPeriod[] | undefined {
  if (!Array.isArray(rawPeriods)) return undefined;
  const valid: ResidencyPeriod[] = [];
  for (const item of rawPeriods) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const start = typeof p.start === 'string' ? p.start.trim() : '';
    if (!start) continue;
    const end = typeof p.end === 'string' ? p.end.trim() : undefined;
    const current = Boolean(p.current);
    const note = typeof p.note === 'string' ? p.note.trim() : undefined;
    const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    valid.push({ id, start, end, current, note });
  }
  return valid.length > 0 ? valid : undefined;
}

/**
 * Sanitizes and validates the schema of incoming user place maps (e.g. from share codes).
 * It filters prototype pollution keys, verifies data types, and normalizes status values.
 */
export function sanitizePlaces(places: UserPlacesMap): UserPlacesMap {
  if (!places || typeof places !== 'object' || Array.isArray(places)) {
    return {};
  }
  
  const sanitized: UserPlacesMap = {};
  const VALID_STATUSES = new Set<PlaceStatus>(['VISITED', 'WISHLIST', 'AVOID', 'REVISIT', 'NONE']);
  
  for (const [key, value] of Object.entries(places)) {
    // 0. Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor') {
      continue;
    }

    // 1. Ensure value is a non-null object
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    // 2. Validate status value
    const rawStatus = String(value.status || 'NONE').toUpperCase();
    const status = VALID_STATUSES.has(rawStatus as PlaceStatus) ? (rawStatus as PlaceStatus) : 'NONE';

    // 3. Validate nested region maps
    const cleanRegions: RegionData = {};
    if (value.regions && typeof value.regions === 'object' && !Array.isArray(value.regions)) {
      for (const [rKey, rVal] of Object.entries(value.regions)) {
        if (rKey === '__proto__' || rKey === 'constructor') {
          continue;
        }

        const rawRVal = String(rVal || 'NONE').toUpperCase();
        if (VALID_STATUSES.has(rawRVal as PlaceStatus)) {
          cleanRegions[rKey] = rawRVal as PlaceStatus;
        }
      }
    }

    const lived = Boolean(value.lived);
    const periods = sanitizePeriods(value.periods);

    const cleanLivedRegions: RegionLivedData = {};
    if (value.livedRegions && typeof value.livedRegions === 'object' && !Array.isArray(value.livedRegions)) {
      for (const [rKey, rVal] of Object.entries(value.livedRegions)) {
        if (rKey === '__proto__' || rKey === 'constructor') continue;
        if (rVal) cleanLivedRegions[rKey] = true;
      }
    }

    const cleanRegionPeriods: RegionResidencyData = {};
    if (value.regionPeriods && typeof value.regionPeriods === 'object' && !Array.isArray(value.regionPeriods)) {
      for (const [rKey, rVal] of Object.entries(value.regionPeriods)) {
        if (rKey === '__proto__' || rKey === 'constructor') continue;
        const validP = sanitizePeriods(rVal);
        if (validP && validP.length > 0) cleanRegionPeriods[rKey] = validP;
      }
    }
    
    sanitized[key] = {
      status,
      regions: cleanRegions,
      ...(lived ? { lived: true } : {}),
      ...(periods && periods.length > 0 ? { periods } : {}),
      ...(Object.keys(cleanLivedRegions).length > 0 ? { livedRegions: cleanLivedRegions } : {}),
      ...(Object.keys(cleanRegionPeriods).length > 0 ? { regionPeriods: cleanRegionPeriods } : {})
    };
  }
  
  return sanitized;
}
