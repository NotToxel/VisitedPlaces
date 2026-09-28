import { MICROSTATES } from '../data/mapData';
import { getAllTerritories } from '../data/territoriesRegistry';
import type { UserPlacesMap } from '../store/useStore';

export interface MapCompareResult {
  type: 'EVERYONE_VISITED' | 'MOST_VISITED' | 'ONLY_ME_VISITED' | 'THEY_VISITED' | 'EVERYONE_WISHLIST' | 'MIXED_WISHLIST' | 'EVERYONE_AVOID' | 'EVERYONE_REVISIT' | 'MIXED_REVISIT' | 'NONE';
  label: string;
  count: number;
  totalUsers: number;
}

export interface CompareTraveler {
  name: string;
  places: UserPlacesMap;
}

export function computeMergedData(myPlaces: UserPlacesMap, friends: readonly CompareTraveler[]): Record<string, MapCompareResult> {
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const totalUsers = allUsers.length;
    const result: Record<string, MapCompareResult> = {};

    // Gather all uniquely mentioned countries, microstates, and territories
    const allCountryCodes = new Set<string>();
    const specialPlaceIds = new Set([
      ...MICROSTATES.map((place) => place.id),
      ...getAllTerritories().map((place) => place.id),
    ]);
    allUsers.forEach(u => Object.keys(u.places).forEach(code => {
      if (!code.includes('-') || specialPlaceIds.has(code)) {
        allCountryCodes.add(code);
      }
    }));

    allCountryCodes.forEach(code => {
      let visitedCount = 0;
      let wishlistCount = 0;
      let avoidCount = 0;
      let revisitCount = 0;
      const iVisited = myPlaces[code]?.status === 'VISITED';
      const iRevisit = myPlaces[code]?.status === 'REVISIT';

      allUsers.forEach(u => {
        const status = u.places[code]?.status;
        if (status === 'VISITED') visitedCount++;
        if (status === 'WISHLIST') wishlistCount++;
        if (status === 'AVOID') avoidCount++;
        if (status === 'REVISIT') revisitCount++;
      });

      if (visitedCount === 0 && wishlistCount === 0 && avoidCount === 0 && revisitCount === 0) return;

      let type: MapCompareResult['type'] = 'NONE';
      let label = '';

      if (visitedCount === totalUsers) {
        type = 'EVERYONE_VISITED';
        label = 'Everyone Visited';
      } else if (revisitCount === totalUsers) {
        type = 'EVERYONE_REVISIT';
        label = 'Everyone Revisit';
      } else if (visitedCount + revisitCount === totalUsers) {
        type = 'MOST_VISITED';
        label = 'Visited & Revisit';
      } else if (revisitCount > 0) {
        type = 'MIXED_REVISIT';
        label = 'Revisit by Some';
      } else if (visitedCount > 1) {
        type = 'MOST_VISITED';
        label = 'Most Visited';
      } else if (visitedCount === 1) {
        type = (iVisited || iRevisit) ? 'ONLY_ME_VISITED' : 'THEY_VISITED';
        label = (iVisited || iRevisit) ? 'Only I Visited' : 'Someone Visited';
      } else if (wishlistCount === totalUsers) {
        type = 'EVERYONE_WISHLIST';
        label = 'Everyone Wishlisted';
      } else if (wishlistCount > 0) {
        type = 'MIXED_WISHLIST';
        label = 'Wishlisted by Some';
      } else if (avoidCount === totalUsers) {
        type = 'EVERYONE_AVOID';
        label = 'Everyone Avoids';
      }

      result[code] = {
        type,
        label,
        count: (visitedCount > 0 || revisitCount > 0) ? (visitedCount + revisitCount) : (wishlistCount > 0 ? wishlistCount : avoidCount),
        totalUsers
      };
    });

    return result;
}

export function computeCompatibilityScore(myPlaces: UserPlacesMap, friends: readonly CompareTraveler[]): number {
    if (friends.length === 0) return 0;
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const allCodes = new Set<string>();
    allUsers.forEach(u => Object.keys(u.places).forEach(code => {
      const status = u.places[code]?.status;
      if (status && status !== 'NONE') allCodes.add(code);
    }));
    if (allCodes.size === 0) return 0;
    let mutualCount = 0;
    allCodes.forEach(code => {
      const statuses = allUsers.map(u => u.places[code]?.status).filter(Boolean);
      const allSame = statuses.length === allUsers.length && statuses.every(s => s === statuses[0]);
      if (allSame) mutualCount++;
    });
    return Math.round((mutualCount / allCodes.size) * 100);
}

export function computeTopWantedUnvisited(mergedData: Record<string, MapCompareResult>, myPlaces: UserPlacesMap, friends: readonly CompareTraveler[]): { code: string; visited: number; wishlist: number }[] {
    return Object.keys(mergedData)
      .map((code) => {
        let visited = 0;
        let wlist = 0;
        if (myPlaces[code]?.status === 'VISITED' || myPlaces[code]?.status === 'REVISIT') visited++;
        if (myPlaces[code]?.status === 'WISHLIST') wlist++;
        friends.forEach(f => {
          if (f.places[code]?.status === 'VISITED' || f.places[code]?.status === 'REVISIT') visited++;
          if (f.places[code]?.status === 'WISHLIST') wlist++;
        });
        return { code, visited, wishlist: wlist };
      })
      .filter(item => item.visited === 0 && item.wishlist > 1)
      .sort((a, b) => b.wishlist - a.wishlist)
      .slice(0, 5);
}

export function computeWantedButVisited(mergedData: Record<string, MapCompareResult>, myPlaces: UserPlacesMap, friends: readonly CompareTraveler[]): { code: string; visited: number; wishlist: number; whoVisited: string[]; whoWants: string[] }[] {
    return Object.keys(mergedData)
      .map((code) => {
        let visited = 0;
        let wlist = 0;
        const whoVisited: string[] = [];
        const whoWants: string[] = [];

        if (myPlaces[code]?.status === 'VISITED' || myPlaces[code]?.status === 'REVISIT') {
          visited++;
          whoVisited.push('Me');
        }
        if (myPlaces[code]?.status === 'WISHLIST') {
          wlist++;
          whoWants.push('Me');
        }

        friends.forEach(f => {
          if (f.places[code]?.status === 'VISITED' || f.places[code]?.status === 'REVISIT') {
            visited++;
            whoVisited.push(f.name);
          }
          if (f.places[code]?.status === 'WISHLIST') {
            wlist++;
            whoWants.push(f.name);
          }
        });

        return { code, visited, wishlist: wlist, whoVisited, whoWants };
      })
      .filter(item => item.visited > 0 && item.wishlist > 0)
      .sort((a, b) => b.wishlist - a.wishlist)
      .slice(0, 5);
}
