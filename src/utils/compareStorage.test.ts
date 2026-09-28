import { describe, expect, it } from 'vitest';
import { loadActiveGroupId, loadCompareGroups, saveActiveGroupId, saveCompareGroups } from './compareStorage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe('comparison storage', () => {
  it('round trips groups and falls back when the selected group is gone', () => {
    const storage = memoryStorage();
    const groups = [{ id: 'friends', name: 'Friends', friends: [{ id: 'alex', name: 'Alex', places: { FRA: { status: 'VISITED' as const, regions: {} } } }] }];
    saveCompareGroups(groups, storage);
    saveActiveGroupId('missing', storage);

    expect(loadCompareGroups(storage)).toEqual(groups);
    expect(loadActiveGroupId(groups, storage)).toBe('friends');
  });

  it('discards malformed saved entries without discarding valid groups', () => {
    const storage = memoryStorage();
    storage.setItem('visited-places-compare-groups', JSON.stringify([
      null,
      { id: 'bad', name: 'Bad' },
      { id: 'good', name: 'Good', friends: [null, { id: 'friend', name: 'Friend', places: { USA: { status: 'BOGUS' } } }] },
    ]));

    expect(loadCompareGroups(storage)).toEqual([{ id: 'good', name: 'Good', friends: [{ id: 'friend', name: 'Friend', places: { USA: { status: 'NONE', regions: {} } } }] }]);
  });
});
