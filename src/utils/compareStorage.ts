import { sanitizePlaces } from '../store/useStore';
import type { UserPlacesMap } from '../store/useStore';

export interface FriendData {
  id: string;
  name: string;
  places: UserPlacesMap;
}

export interface CompareGroup {
  id: string;
  name: string;
  friends: FriendData[];
}

const GROUPS_KEY = 'visited-places-compare-groups';
const ACTIVE_GROUP_KEY = 'visited-places-active-group-id';
type CompareStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function loadCompareGroups(storage: CompareStorage = localStorage): CompareGroup[] {
  try {
    const saved = storage.getItem(GROUPS_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((candidate): CompareGroup[] => {
      if (!isRecord(candidate) || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !Array.isArray(candidate.friends)) return [];
      const friends: FriendData[] = candidate.friends.flatMap((friend: unknown): FriendData[] => {
        if (!isRecord(friend) || typeof friend.id !== 'string' || typeof friend.name !== 'string') return [];
        return [{ id: friend.id, name: friend.name, places: sanitizePlaces(friend.places as UserPlacesMap) }];
      });
      if (candidate.id === 'default' && friends.length === 0) return [];
      return [{ id: candidate.id, name: candidate.name, friends }];
    });
  } catch (error) {
    console.warn('Could not load compare groups', error);
    return [];
  }
}

export function loadActiveGroupId(groups: readonly CompareGroup[], storage: CompareStorage = localStorage): string {
  try {
    const saved = storage.getItem(ACTIVE_GROUP_KEY);
    if (saved && groups.some((group) => group.id === saved)) return saved;
  } catch (error) {
    console.warn('Could not load active compare group', error);
  }
  return groups[0]?.id ?? '';
}

export function saveCompareGroups(groups: readonly CompareGroup[], storage: CompareStorage = localStorage): void {
  try {
    storage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch (error) {
    console.warn('Could not save compare groups', error);
  }
}

export function saveActiveGroupId(id: string, storage: CompareStorage = localStorage): void {
  try {
    storage.setItem(ACTIVE_GROUP_KEY, id);
  } catch (error) {
    console.warn('Could not save active compare group', error);
  }
}
