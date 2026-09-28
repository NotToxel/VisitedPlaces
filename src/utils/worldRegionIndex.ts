export interface WorldRegion {
  countryId: string;
  id: string;
  name: string;
}

let indexPromise: Promise<WorldRegion[]> | null = null;

/** The 145 KB region list loads only when someone searches the world map. */
export function loadWorldRegionIndex(): Promise<WorldRegion[]> {
  if (!indexPromise) {
    indexPromise = import('../data/regionSearchIndex.json')
      .then(({ default: rows }) => rows.map(([countryId, id, name]) => ({ countryId, id, name })))
      .catch((error: unknown) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
}
