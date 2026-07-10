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
      
      loadPlaces: (places) => set({ places })
    }),
    {
      // v2.0 CLEAN BREAK: new storage key so old data is not loaded
      name: 'visited-places-v2',
      // Only persist places and theme in localStorage
      partialize: (state) => ({
        places: state.places,
        theme: state.theme,
      } as AppState),
    }
  )
);
