import { describe, it, expect } from 'vitest';
import { getPlaceFlagUrl } from './flagUtils';
import { sanitizePlaces } from '../store/useStore';
import { hasDrilldownSupport } from './topojsonCache';

describe('Region & Flag Helper Logic', () => {
  describe('hasDrilldownSupport', () => {
    it('should return true for Singapore (SGP)', () => {
      expect(hasDrilldownSupport('SGP')).toBe(true);
    });
  });

  describe('getPlaceFlagUrl', () => {
    it('should return USA sub-region flag URL with correct extension', () => {
      const californiaUrl = getPlaceFlagUrl('USA-US-CA');
      expect(californiaUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/US/US-CA.svg');

      const newYorkUrl = getPlaceFlagUrl('USA-US-NY');
      expect(newYorkUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/US/US-NY.svg');
    });

    it('should return GBR sub-region flag URL with correct extension (e.g. .jpg for Bristol, .png for Hull)', () => {
      const bristolUrl = getPlaceFlagUrl('GBR-GB-BST');
      expect(bristolUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/GB/GB-BST.jpg');

      const hullUrl = getPlaceFlagUrl('GBR-GB-KHL');
      expect(hullUrl).toBe('https://cdn.jsdelivr.net/gh/amckenna41/iso3166-flags@main/iso3166-2-flags/GB/GB-KHL.png');
    });

    it('should resolve to Singapore country flag for SGP planning area keys', () => {
      const bishanFlag = getPlaceFlagUrl('SGP-bishan');
      expect(bishanFlag).toBe('https://flagcdn.com/sg.svg');
    });

    it('should fall back to country flag URL for unmatched keys', () => {
      const usUrl = getPlaceFlagUrl('USA-US-XYZ');
      expect(usUrl).toBe('https://flagcdn.com/us.svg');

      const gbUrl = getPlaceFlagUrl('GBR-GB-XYZ');
      expect(gbUrl).toBe('https://flagcdn.com/gb.svg');
    });
  });

  describe('sanitizePlaces input validation utility', () => {
    it('should prevent prototype pollution and handle malformed input gracefully', () => {
      const maliciousData = JSON.parse(
        '{"__proto__": {"polluted": true}, "constructor": {"polluted": true}, "USA": "visited", "FRA": {"status": "INVALID_STATUS", "regions": null}, "GER": {"status": "VISITED", "regions": {"__proto__": "polluted", "DE-BY": "VISITED", "DE-NW": "INVALID"}}}'
      );

      const result = sanitizePlaces(maliciousData);

      // Verify prototype pollution is prevented
      expect((result as unknown as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
      expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();

      // Verify string value for country is skipped instead of crashing
      expect(result['USA']).toBeUndefined();

      // Verify invalid status and null regions are handled gracefully
      expect(result['FRA']).toBeDefined();
      expect(result['FRA'].status).toBe('NONE');
      expect(result['FRA'].regions).toEqual({});

      // Verify region prototype pollution is prevented and invalid region status is discarded
      expect(result['GER']).toBeDefined();
      expect(result['GER'].status).toBe('VISITED');
      expect((result['GER'].regions as unknown as Record<string, unknown>).polluted).toBeUndefined();
      expect(result['GER'].regions['DE-BY']).toBe('VISITED');
      expect(result['GER'].regions['DE-NW']).toBeUndefined();
    });
  });
});
