import { normalizeString } from './searchUtils';

/** One row in the generated GeoNames city/town index. */
export interface WorldPlace {
  id: number;
  name: string;
  asciiName: string;
  countryId: string;
  areaName: string;
  coordinates: [number, number]; // [longitude, latitude]
  population: number;
  territoryId?: string;
}

const bucketCache = new Map<string, Promise<WorldPlace[]>>();

export function getPlaceBucketKey(query: string): string | null {
  const normalized = normalizeString(query).trim();
  const word = normalized.split(/[^\p{L}\p{N}_]+/u).find(Boolean);
  if (!word || Array.from(word).length < 3) return null;
  let hash = 0;
  for (const char of Array.from(word).slice(0, 3)) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 256;
  }
  return hash.toString(16).padStart(2, '0');
}

function parseBucket(value: unknown): WorldPlace[] {
  if (!Array.isArray(value)) return [];
  const places: WorldPlace[] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length < 9 ||
      typeof row[0] !== 'number' || typeof row[1] !== 'string' ||
      typeof row[2] !== 'string' || typeof row[3] !== 'string' ||
      typeof row[4] !== 'string' || typeof row[5] !== 'number' ||
      typeof row[6] !== 'number' || typeof row[7] !== 'number' ||
      typeof row[8] !== 'string') continue;
    places.push({
      id: row[0], name: row[1], asciiName: row[2], countryId: row[3],
      areaName: row[4], coordinates: [row[6], row[5]], population: row[7],
      territoryId: row[8] || undefined,
    });
  }
  return places;
}

/** Loads only the ~1/256 slice needed by this query. No third-party requests. */
export function loadWorldPlaceBucket(key: string): Promise<WorldPlace[]> {
  const cached = bucketCache.get(key);
  if (cached) return cached;
  const url = `${import.meta.env.BASE_URL}place-index/${key}.json`;
  const promise = (async () => {
    let response: Response | undefined;
    try {
      response = await fetch(url);
    } catch {
      // A previously used bucket remains available when the browser is offline.
      if (typeof window !== 'undefined' && 'caches' in window) {
        response = await (await caches.open('visited-places-search-v1')).match(url);
      }
    }
    if (!response?.ok) throw new Error('Place search data is unavailable');
    if (typeof window !== 'undefined' && 'caches' in window) {
      const copy = response.clone();
      void caches.open('visited-places-search-v1').then((cache) => cache.put(url, copy)).catch(() => {});
    }
    return parseBucket(await response.json() as unknown);
  })().catch((error: unknown) => {
    bucketCache.delete(key);
    throw error;
  });
  bucketCache.set(key, promise);
  return promise;
}
