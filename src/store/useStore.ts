import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ONS_TO_ISO } from '../data/gbrRegionData';
import { US_FIPS_TO_ISO } from '../data/usaRegionData';
import { NUMERIC_TO_A3 } from '../data/countries';

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
      
      loadPlaces: (places) => set({ places: migrateLegacyPlaces(places) })
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
          state.places = migrateLegacyPlaces(state.places);
        }
      }
    }
  )
);

/**
 * Migration helper to translate old FIPS keys (USA-XX) and ONS keys (GBR-EXXXXXXXX)
 * into standard ISO 3166-2 keys (USA-US-XX, GBR-GB-XXX).
 */
export function migrateLegacyPlaces(places: UserPlacesMap): UserPlacesMap {
  if (!places) return places;
  
  const migrated: UserPlacesMap = {};
  
  for (const [key, value] of Object.entries(places)) {
    let newKey = key;
    
    // 1. Migrate numeric country code keys (e.g. "724" -> "ESP")
    if (NUMERIC_TO_A3[newKey]) {
      newKey = NUMERIC_TO_A3[newKey];
    }
    
    // 2. Migrate USA FIPS keys (e.g. USA-06 or just 06 -> USA-US-CA)
    let fips = '';
    if (newKey.startsWith('USA-')) {
      fips = newKey.substring(4);
    } else if (/^\d{2}$/.test(newKey)) {
      fips = newKey;
    }
    if (fips && US_FIPS_TO_ISO[fips]) {
      newKey = `USA-${US_FIPS_TO_ISO[fips]}`;
    }
    
    // 3. Migrate GBR ONS keys (e.g. GBR-E06000023 or E06000023 -> GBR-GB-BST)
    let ons = '';
    if (newKey.startsWith('GBR-')) {
      ons = newKey.substring(4);
    } else if (/^[ENSW]\d{8}$/.test(newKey)) {
      ons = newKey;
    }
    if (ons && ONS_TO_ISO[ons]) {
      newKey = `GBR-${ONS_TO_ISO[ons]}`;
    }
    
    // Migrate nested region maps
    let newRegions = value.regions;
    if (value.regions && Object.keys(value.regions).length > 0) {
      newRegions = {};
      for (const [rKey, rVal] of Object.entries(value.regions)) {
        let newRKey = rKey;
        
        // USA regions
        let rFips = '';
        if (rKey.startsWith('USA-')) {
          rFips = rKey.substring(4);
        } else if (/^\d{2}$/.test(rKey)) {
          rFips = rKey;
        }
        if (rFips && US_FIPS_TO_ISO[rFips]) {
          newRKey = `USA-${US_FIPS_TO_ISO[rFips]}`;
        }
        
        // GBR regions
        let rOns = '';
        if (rKey.startsWith('GBR-')) {
          rOns = rKey.substring(4);
        } else if (/^[ENSW]\d{8}$/.test(rKey)) {
          rOns = rKey;
        }
        if (rOns && ONS_TO_ISO[rOns]) {
          newRKey = `GBR-${ONS_TO_ISO[rOns]}`;
        }
        
        newRegions[newRKey] = rVal;
      }
    }
    
    migrated[newKey] = {
      status: value.status,
      regions: newRegions
    };
  }
  
  return migrated;
}
