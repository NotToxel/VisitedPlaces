import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Mock window and localStorage to suppress Zustand persist warnings
// Must be defined before importing './useStore' so Zustand detects them during initialization.
Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  writable: true
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

let useStore: typeof import('./useStore').useStore;

beforeAll(async () => {
  const storeModule = await import('./useStore');
  useStore = storeModule.useStore;
});

describe('Zustand App Store', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store state before each test to ensure test isolation
    useStore.setState({
      places: {},
      theme: 'dark',
    });
  });

  describe('Theme Actions', () => {
    it('should have initial dark theme', () => {
      expect(useStore.getState().theme).toBe('dark');
    });

    it('should toggle theme between dark and light', () => {
      const store = useStore;
      
      store.getState().toggleTheme();
      expect(store.getState().theme).toBe('light');

      store.getState().toggleTheme();
      expect(store.getState().theme).toBe('dark');
    });
  });

  describe('Country Status Actions', () => {
    it('should set status for a country', () => {
      const store = useStore;
      
      store.getState().setCountryStatus('USA', 'VISITED');
      expect(store.getState().places['USA']).toBeDefined();
      expect(store.getState().places['USA'].status).toBe('VISITED');
    });

    it('should remove country when status is set to NONE', () => {
      const store = useStore;
      
      store.getState().setCountryStatus('USA', 'VISITED');
      expect(store.getState().places['USA']).toBeDefined();

      store.getState().setCountryStatus('USA', 'NONE');
      expect(store.getState().places['USA']).toBeUndefined();
    });

    it('should cascade parent status when subregion code is passed in setCountryStatus', () => {
      const store = useStore;
      
      // Setting a subregion (contains '-') should cascade to parent
      store.getState().setCountryStatus('USA-CA', 'VISITED');
      expect(store.getState().places['USA-CA'].status).toBe('VISITED');
      expect(store.getState().places['USA'].status).toBe('VISITED');
      
      // Reset
      store.setState({ places: {} });

      // Wishlist cascade (only if parent not visited)
      store.getState().setCountryStatus('USA-NY', 'WISHLIST');
      expect(store.getState().places['USA'].status).toBe('WISHLIST');

      // Parent already VISITED should not be overridden by WISHLIST subregion
      store.getState().setCountryStatus('USA', 'VISITED');
      store.getState().setCountryStatus('USA-NY', 'WISHLIST');
      expect(store.getState().places['USA'].status).toBe('VISITED');
    });
  });

  describe('Region Status Actions (setRegionStatus)', () => {
    it('should add region and cascade parent status to VISITED if region is VISITED', () => {
      const store = useStore;
      
      store.getState().setRegionStatus('USA', 'US-CA', 'VISITED');
      expect(store.getState().places['USA']).toBeDefined();
      expect(store.getState().places['USA'].status).toBe('VISITED');
      expect(store.getState().places['USA'].regions['US-CA']).toBe('VISITED');
    });

    it('should cascade parent status to WISHLIST if region is WISHLIST and parent is NONE', () => {
      const store = useStore;
      
      store.getState().setRegionStatus('USA', 'US-CA', 'WISHLIST');
      expect(store.getState().places['USA'].status).toBe('WISHLIST');
    });

    it('should not override parent status VISITED with WISHLIST region', () => {
      const store = useStore;
      
      store.getState().setCountryStatus('USA', 'VISITED');
      store.getState().setRegionStatus('USA', 'US-CA', 'WISHLIST');
      expect(store.getState().places['USA'].status).toBe('VISITED');
    });

    it('should clean up country from state if country is NONE and all regions are removed (NONE)', () => {
      const store = useStore;
      
      store.getState().setRegionStatus('USA', 'US-CA', 'VISITED');
      expect(store.getState().places['USA']).toBeDefined();

      // Set region to NONE, parent is still VISITED because parent status isn't reset automatically on region deletion unless parent itself becomes NONE
      store.getState().setRegionStatus('USA', 'US-CA', 'NONE');
      expect(store.getState().places['USA']).toBeDefined();
      expect(store.getState().places['USA'].status).toBe('VISITED');
      expect(store.getState().places['USA'].regions['US-CA']).toBeUndefined();

      // Now set parent country status to NONE
      store.getState().setCountryStatus('USA', 'NONE');
      expect(store.getState().places['USA']).toBeUndefined();
    });
  });

  describe('Load Places Action', () => {
    it('should load standard places map', () => {
      const store = useStore;
      const testMap = {
        CAN: {
          status: 'VISITED' as const,
          regions: {}
        }
      };

      store.getState().loadPlaces(testMap);
      expect(store.getState().places).toEqual(testMap);
    });
  });



  describe('Dual Schema Sub-region Synchronization', () => {
    beforeEach(() => {
      useStore.setState({ places: {} });
    });

    it('should synchronize flat subregion key into nested regions object on setCountryStatus', () => {
      const store = useStore;
      store.getState().setCountryStatus('USA-US-CA', 'VISITED');
      
      // Flat key check
      expect(store.getState().places['USA-US-CA']).toBeDefined();
      expect(store.getState().places['USA-US-CA'].status).toBe('VISITED');
      
      // Nested key check
      expect(store.getState().places['USA']).toBeDefined();
      expect(store.getState().places['USA'].regions['USA-US-CA']).toBe('VISITED');
    });

    it('should synchronize nested region into flat keys map on setRegionStatus', () => {
      const store = useStore;
      store.getState().setRegionStatus('USA', 'USA-US-NY', 'WISHLIST');
      
      // Nested key check
      expect(store.getState().places['USA']).toBeDefined();
      expect(store.getState().places['USA'].regions['USA-US-NY']).toBe('WISHLIST');
      
      // Flat key check
      expect(store.getState().places['USA-US-NY']).toBeDefined();
      expect(store.getState().places['USA-US-NY'].status).toBe('WISHLIST');
    });

    it('should delete from both representations when status is NONE', () => {
      const store = useStore;
      
      // 1. Check via setCountryStatus -> NONE
      store.getState().setCountryStatus('USA-US-CA', 'VISITED');
      store.getState().setCountryStatus('USA-US-CA', 'NONE');
      expect(store.getState().places['USA-US-CA']).toBeUndefined();
      expect(store.getState().places['USA']?.regions['USA-US-CA']).toBeUndefined();

      // 2. Check via setRegionStatus -> NONE
      store.getState().setRegionStatus('USA', 'USA-US-NY', 'WISHLIST');
      store.getState().setRegionStatus('USA', 'USA-US-NY', 'NONE');
      expect(store.getState().places['USA-US-NY']).toBeUndefined();
      expect(store.getState().places['USA']?.regions['USA-US-NY']).toBeUndefined();
    });
  });
});
