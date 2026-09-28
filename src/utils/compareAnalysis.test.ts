import { describe, expect, it } from 'vitest';
import { computeCompatibilityScore, computeMergedData, computeTopWantedUnvisited, computeWantedButVisited } from './compareAnalysis';
import type { CompareTraveler } from './compareAnalysis';
import type { UserPlacesMap } from '../store/useStore';

const place = (status: 'VISITED' | 'WISHLIST'): { status: 'VISITED' | 'WISHLIST'; regions: Record<string, never> } => ({ status, regions: {} });

describe('comparison analysis', () => {
  it('classifies shared visits and ignores region keys in country summaries', () => {
    const mine: UserPlacesMap = { USA: place('VISITED'), 'USA-CA': place('VISITED') };
    const friends: CompareTraveler[] = [{ name: 'Alex', places: { USA: place('VISITED') } }];
    const result = computeMergedData(mine, friends);

    expect(result.USA.type).toBe('EVERYONE_VISITED');
    expect(result['USA-CA']).toBeUndefined();
    expect(computeCompatibilityScore(mine, friends)).toBe(50);
  });

  it('finds shared wishes and places one traveler can show another', () => {
    const mine: UserPlacesMap = { FRA: place('WISHLIST'), JPN: place('VISITED') };
    const friends: CompareTraveler[] = [
      { name: 'Alex', places: { FRA: place('WISHLIST'), JPN: place('WISHLIST') } },
      { name: 'Sam', places: { FRA: place('WISHLIST') } },
    ];
    const merged = computeMergedData(mine, friends);

    expect(computeTopWantedUnvisited(merged, mine, friends).map((item) => item.code)).toEqual(['FRA']);
    expect(computeWantedButVisited(merged, mine, friends)[0]).toMatchObject({ code: 'JPN', whoVisited: ['Me'], whoWants: ['Alex'] });
  });
});
