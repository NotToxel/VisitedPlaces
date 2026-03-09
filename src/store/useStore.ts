import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Enums and Types
export type PlaceStatus = 'VISITED' | 'WISHLIST' | 'AVOID' | 'NONE';

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
  
  // Actions
  setCountryStatus: (countryCode: string, status: PlaceStatus) => void;
  setRegionStatus: (countryCode: string, regionCode: string, status: PlaceStatus) => void;
  toggleTheme: () => void;
  
  // Load whole state (for sharing / resetting)
  loadPlaces: (places: UserPlacesMap) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      places: {},
      theme: 'dark',

      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      setCountryStatus: (countryCode, status) => set((state) => {
        const updatedPlaces = { ...state.places };
        
        if (status === 'NONE') {
          delete updatedPlaces[countryCode];
        } else {
          updatedPlaces[countryCode] = {
            status,
            regions: updatedPlaces[countryCode]?.regions || {}
          };

          // Cascade up: if selecting a subregion, also select the parent
          if (countryCode.includes('-')) {
            const parentCode = countryCode.split('-')[0];
            const currentParentStatus = updatedPlaces[parentCode]?.status || 'NONE';
            
            if (status === 'VISITED') {
               updatedPlaces[parentCode] = { status: 'VISITED', regions: {} };
            } else if (status === 'WISHLIST') {
               if (currentParentStatus !== 'VISITED') {
                   updatedPlaces[parentCode] = { status: 'WISHLIST', regions: {} };
               }
            } else if (status === 'AVOID') {
               if (currentParentStatus === 'NONE') {
                   updatedPlaces[parentCode] = { status: 'AVOID', regions: {} };
               }
            }
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
        } else {
          regions[regionCode] = status;
        }
        
        updatedPlaces[countryCode] = { ...country, regions };
        
        // Cleanup if empty
        if (updatedPlaces[countryCode].status === 'NONE' && Object.keys(regions).length === 0) {
          delete updatedPlaces[countryCode];
        }
        
        return { places: updatedPlaces };
      }),
      
      loadPlaces: (places) => set({ places })
    }),
    {
      name: 'visited-places-storage', // unique name for localStorage key
    }
  )
);
