import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Enums and Types
export type PlaceStatus = 'VISITED' | 'WISHLIST' | 'AVOID' | 'REVISIT' | 'NONE';

export interface RegionData {
  [regionCode: string]: PlaceStatus;
}

export interface CountryData {
  status: PlaceStatus;
  regions: RegionData;
}

export interface UserPlacesMap {
  [countryCode: string]: CountryData;
}

export interface AppState {
  // Current user's places
  places: UserPlacesMap;
  theme: 'dark' | 'light';
  neDataLoaded: boolean;
  
  // Actions
  setCountryStatus: (countryCode: string, status: PlaceStatus) => void;
  setRegionStatus: (countryCode: string, regionCode: string, status: PlaceStatus) => void;
  toggleTheme: () => void;
  setNeDataLoaded: (loaded: boolean) => void;
  
  // Load whole state (for sharing / resetting)
  loadPlaces: (places: UserPlacesMap) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      places: {},
      theme: 'dark',
      neDataLoaded: false,

      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setNeDataLoaded: (loaded) => set({ neDataLoaded: loaded }),
      
      setCountryStatus: (countryCode, status) => set((state) => {
        const updatedPlaces = { ...state.places };
        
        if (status === 'NONE') {
          delete updatedPlaces[countryCode];
          
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
              // Cleanup parent if it becomes empty and has status NONE
              if (updatedPlaces[parentCode].status === 'NONE' && Object.keys(regions).length === 0) {
                delete updatedPlaces[parentCode];
              }
            }
          }
        } else {
          updatedPlaces[countryCode] = {
            status,
            regions: updatedPlaces[countryCode]?.regions || {}
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
            const parentRegions = { ...(updatedPlaces[parentCode]?.regions || {}) };
            parentRegions[countryCode] = status;

            updatedPlaces[parentCode] = {
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
          delete updatedPlaces[regionCode]; // Sync schema: delete flat key too
        } else {
          regions[regionCode] = status;
          // Sync schema: set flat key too
          updatedPlaces[regionCode] = {
            status,
            regions: {}
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

        updatedPlaces[countryCode] = { status: parentStatus, regions };
        
        // Cleanup if empty
        if (updatedPlaces[countryCode].status === 'NONE' && Object.keys(regions).length === 0) {
          delete updatedPlaces[countryCode];
        }
        
        return { places: updatedPlaces };
      }),
      
      loadPlaces: (places) => set({ places: sanitizePlaces(places) })
    }),
    {
      name: 'visited-places-storage',
      // Only persist places and theme in localStorage
      partialize: (state) => ({
        places: state.places,
        theme: state.theme,
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
    
    sanitized[key] = {
      status,
      regions: cleanRegions
    };
  }
  
  return sanitized;
}
