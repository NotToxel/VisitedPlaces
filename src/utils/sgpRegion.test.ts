import { describe, it, expect } from 'vitest';
import { hasDrilldownSupport } from './topojsonCache';
import { getPlaceFlagUrl } from './flagUtils';

describe('Singapore Region Logic', () => {
  describe('hasDrilldownSupport', () => {
    it('should return true for Singapore (SGP)', () => {
      expect(hasDrilldownSupport('SGP')).toBe(true);
    });
  });

  describe('getPlaceFlagUrl for SGP planning areas', () => {
    it('should resolve to Singapore country flag for SGP planning area keys', () => {
      const bishanFlag = getPlaceFlagUrl('SGP-bishan');
      expect(bishanFlag).toBe('https://flagcdn.com/sg.svg');

      const woodlandsFlag = getPlaceFlagUrl('SGP-woodlands');
      expect(woodlandsFlag).toBe('https://flagcdn.com/sg.svg');
    });
  });
});
