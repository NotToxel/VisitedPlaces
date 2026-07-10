import { describe, it, expect } from 'vitest';
import { getUsaIsoCode } from '../data/usaRegionData';
import { getPlaceFlagUrl } from './flagUtils';
import { migrateLegacyPlaces } from '../store/useStore';

describe('USA Region Helper Logic', () => {
  describe('getUsaIsoCode', () => {
    it('should map valid FIPS state codes to ISO 3166-2', () => {
      expect(getUsaIsoCode('06')).toBe('US-CA'); // California
      expect(getUsaIsoCode('36')).toBe('US-NY'); // New York
      expect(getUsaIsoCode('48')).toBe('US-TX'); // Texas
      expect(getUsaIsoCode('99')).toBeNull(); // Invalid code
    });
  });

  describe('getPlaceFlagUrl for USA', () => {
    it('should return USA sub-region flag URL with correct extension', () => {
      const californiaUrl = getPlaceFlagUrl('USA-US-CA');
      expect(californiaUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/US/US-CA.svg');

      const newYorkUrl = getPlaceFlagUrl('USA-US-NY');
      expect(newYorkUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/US/US-NY.svg');
    });

    it('should fall back to country flag URL (us.svg) for unmatched US keys', () => {
      const url = getPlaceFlagUrl('USA-US-XYZ');
      expect(url).toBe('https://flagcdn.com/us.svg');
    });
  });

  describe('migrateLegacyPlaces key migration utility', () => {
    it('should translate USA FIPS codes and GBR ONS codes to standard ISO 3166-2', () => {
      const legacyData = {
        'USA': {
          status: 'VISITED' as const,
          regions: {
            'USA-06': 'VISITED' as const,
            'USA-36': 'WISHLIST' as const,
          }
        },
        'USA-06': {
          status: 'VISITED' as const,
          regions: {}
        },
        'GBR': {
          status: 'VISITED' as const,
          regions: {
            'GBR-E06000023': 'VISITED' as const,
          }
        },
        'GBR-E06000023': {
          status: 'VISITED' as const,
          regions: {}
        }
      };

      const result = migrateLegacyPlaces(legacyData);

      // Verify flat keys migrated
      expect(result['USA-US-CA']).toBeDefined();
      expect(result['USA-06']).toBeUndefined();
      expect(result['GBR-GB-BST']).toBeDefined();
      expect(result['GBR-E06000023']).toBeUndefined();

      // Verify nested regions migrated
      expect(result['USA'].regions['USA-US-CA']).toBe('VISITED');
      expect(result['USA'].regions['USA-06']).toBeUndefined();
      expect(result['USA'].regions['USA-US-NY']).toBe('WISHLIST');
      
      expect(result['GBR'].regions['GBR-GB-BST']).toBe('VISITED');
      expect(result['GBR'].regions['GBR-E06000023']).toBeUndefined();
    });
  });
});
