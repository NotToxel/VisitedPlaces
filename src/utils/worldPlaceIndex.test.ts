import { describe, expect, it } from 'vitest';
import { getPlaceBucketKey } from './worldPlaceIndex';

describe('world place index', () => {
  it('uses the same bucket for an accented and unaccented query', () => {
    expect(getPlaceBucketKey('São Paulo')).toBe(getPlaceBucketKey('Sao Paulo'));
    expect(getPlaceBucketKey('Pa')).toBeNull();
  });

  it('maps a place query to a stable bucket', () => {
    expect(getPlaceBucketKey('Paris')).toBe('a1');
  });
});
