import { COUNTRIES } from '../data/countries';
import { fetchSubRegions } from './topojsonCache';
import type { TopoRegion } from './topojsonCache';

let searchIndexPromise: Promise<Record<string, TopoRegion[]>> | null = null;

/** Build the optional global region search index only after a user searches for regions. */
export function loadSubRegionSearchIndex(): Promise<Record<string, TopoRegion[]>> {
  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = (async () => {
    const index: Record<string, TopoRegion[]> = {};
    const batchSize = 8;

    for (let offset = 0; offset < COUNTRIES.length; offset += batchSize) {
      const batch = COUNTRIES.slice(offset, offset + batchSize);
      const entries = await Promise.all(batch.map(async ({ id }) => [id, await fetchSubRegions(id)] as const));
      for (const [id, regions] of entries) index[id] = regions;

      // Give typing and map interactions a chance to render between batches.
      if (offset + batchSize < COUNTRIES.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    return index;
  })().catch((error: unknown) => {
    searchIndexPromise = null;
    throw error;
  });

  return searchIndexPromise;
}
