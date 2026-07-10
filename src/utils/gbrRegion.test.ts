import { describe, it, expect } from 'vitest';
import { getCleanGbrName, getGbrIsoCode } from '../data/gbrRegionData';
import { getPlaceFlagUrl } from './flagUtils';
import { getRegionId } from './mapUtils';

describe('GBR Region Helper Logic', () => {
  describe('getCleanGbrName', () => {
    it('should strip ", City of" suffixes', () => {
      expect(getCleanGbrName('Bristol, City of')).toBe('Bristol');
      expect(getCleanGbrName('Kingston upon Hull, City of')).toBe('Kingston upon Hull');
    });

    it('should strip ", County of" suffixes', () => {
      expect(getCleanGbrName('Herefordshire, County of')).toBe('Herefordshire');
    });

    it('should keep multi-word comma names that are not suffixes', () => {
      expect(getCleanGbrName('Newry, Mourne and Down')).toBe('Newry, Mourne and Down');
    });
  });

  describe('getGbrIsoCode', () => {
    it('should map valid ONS codes to ISO 3166-2', () => {
      expect(getGbrIsoCode('E06000023')).toBe('GB-BST'); // Bristol
      expect(getGbrIsoCode('E06000010')).toBe('GB-KHL'); // Kingston upon Hull
      expect(getGbrIsoCode('E09000001')).toBeNull(); // City of London is unmatched
    });
  });

  describe('getPlaceFlagUrl for GBR', () => {
    it('should return GBR sub-region flag URL with correct extension (e.g. .jpg for Bristol, .png for Hull)', () => {
      const bristolUrl = getPlaceFlagUrl('GBR-GB-BST');
      expect(bristolUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/GB/GB-BST.jpg');

      const hullUrl = getPlaceFlagUrl('GBR-GB-KHL');
      expect(hullUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/GB/GB-KHL.png');
    });

    it('should fall back to country flag URL (gb.svg) for unmatched GBR keys', () => {
      const url = getPlaceFlagUrl('GBR-GB-XYZ');
      expect(url).toBe('https://flagcdn.com/gb.svg');
    });

    it('should resolve the Isle of Man territory flag code directly', () => {
      const url = getPlaceFlagUrl('GBR-IM');
      expect(url).toBe('https://flagcdn.com/im.svg');
    });
  });

  describe('getRegionId for GBR Isle of Man', () => {
    it('should map Isle of Man features to canonical GBR-IM ID', () => {
      const imFeature = {
        id: 'IM-X01~',
        properties: {
          iso_3166_2: 'IM-X01~',
          name: 'Isle of Man',
          adm0_a3: 'IMN'
        }
      };
      const result = getRegionId(imFeature, {}, 'GBR');
      expect(result).toBe('GBR-IM');
    });
  });
});
