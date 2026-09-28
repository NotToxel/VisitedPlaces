import { COUNTRIES } from '../data/countries';
import { SEARCH_PLACES } from '../data/placeSearch';
import type { SearchPlace } from '../data/placeSearch';
import { matchCountry, normalizeString } from './searchUtils';
import type { TopoRegion } from './topojsonCache';
import type { WorldPlace } from './worldPlaceIndex';
import type { WorldRegion } from './worldRegionIndex';

export type SearchResult =
  | { kind: 'country'; id: string; name: string }
  | { kind: 'region'; id: string; name: string; countryId: string; matchedPlace?: string }
  | { kind: 'place'; id: string; name: string; countryId: string; regionId: string; regionName: string }
  | { kind: 'locality'; id: string; name: string; countryId: string; areaName: string;
      coordinates: [number, number]; territoryId?: string };

type RegionSearchResult = Extract<SearchResult, { kind: 'region' }>;

const MAX_RESULTS = 5;
const MULTI_REGION_LOCALITIES = new Set(['GBR:london', 'SGP:singapore', 'HKG:hong kong']);

export function isMultiRegionLocality(countryId: string, name: string): boolean {
  return MULTI_REGION_LOCALITIES.has(`${countryId}:${normalizeString(name)}`);
}

function score(value: string, query: string): number {
  const normalized = normalizeString(value).trim();
  if (normalized === query) return 0;
  if (normalized.startsWith(query)) return 1;
  if (normalized.split(/[\s,.-]+/).some((word) => word.startsWith(query))) return 2;
  return normalized.includes(query) ? 3 : -1;
}

function placeScore(place: SearchPlace, query: string): number {
  return Math.min(...[place.name, ...(place.aliases ?? [])].map((value) => {
    const match = score(value, query);
    // Short aliases such as LA and NYC require an exact match.
    if (value.length <= 3 && match !== 0) return Infinity;
    return match < 0 ? Infinity : match;
  }));
}

function localityMatchesRank(place: WorldPlace, query: string): number {
  const nameRank = score(place.name, query);
  const asciiRank = place.asciiName ? score(place.asciiName, query) : -1;
  if (nameRank < 0 && asciiRank < 0) return Infinity;
  return Math.min(nameRank < 0 ? Infinity : nameRank, asciiRank < 0 ? Infinity : asciiRank);
}

export function searchMapPlaces(
  queryText: string, countryId: string | null, regions: TopoRegion[], worldPlaces: WorldPlace[] = [],
  worldRegions: WorldRegion[] = []
): SearchResult[] {
  const query = normalizeString(queryText).trim();
  if (!query) return [];

  if (!countryId) {
    const countryMatches = COUNTRIES.filter((country) => matchCountry(country.name, country.id, country.cca2, query))
      .map((country) => ({
        result: { kind: 'country', id: country.id, name: country.name } as SearchResult,
        rank: score(country.name, query) < 0
          ? country.id.toLowerCase() === query || country.cca2.toLowerCase() === query ? 0 : 4
          : score(country.name, query),
      }));
    const placeMatches = query.length >= 3
      ? SEARCH_PLACES.map((place) => ({ place, rank: placeScore(place, query) }))
        .filter(({ rank }) => Number.isFinite(rank))
        .map(({ place, rank }) => ({
          result: { kind: 'place', id: `${place.countryId}:${place.name}`, name: place.name,
            countryId: place.countryId, regionId: place.regionId, regionName: place.regionName } as SearchResult,
          rank: rank + 1,
        }))
      : [];
    const curatedKeys = new Set(placeMatches.map(({ result }) => `${result.kind === 'place' ? result.countryId : ''}:${normalizeString(result.name)}`));
    const seen = new Set<string>();
    const localityMatches = worldPlaces.filter((place) => {
      const key = `${place.countryId}:${normalizeString(place.name)}:${normalizeString(place.areaName)}`;
      if (curatedKeys.has(`${place.countryId}:${normalizeString(place.name)}`) || seen.has(key)) return false;
      seen.add(key);
      return Number.isFinite(localityMatchesRank(place, query));
    }).map((place) => ({
      result: { kind: 'locality', id: `geo:${place.id}`, name: place.name, countryId: place.countryId,
        areaName: place.areaName, coordinates: place.coordinates, territoryId: place.territoryId } as SearchResult,
      rank: localityMatchesRank(place, query) + 1,
      population: place.population,
    }));
    const relevantCountries = localityMatches.length + placeMatches.length > 0
      ? countryMatches.filter((match) => match.rank < 4) : countryMatches;
    const regionMatches = query.length >= 3 ? worldRegions.map((region) => ({
      region, rank: score(region.name, query),
    })).filter(({ rank }) => rank >= 0).map(({ region, rank }) => ({
      result: { kind: 'region', id: region.id, name: region.name, countryId: region.countryId } as SearchResult,
      rank: rank === 0 ? 0 : rank + 2,
      population: Infinity,
    })) : [];
    const regionNames = new Set(regionMatches.map(({ result }) =>
      `${result.kind === 'region' ? result.countryId : ''}:${normalizeString(result.name)}`));
    const distinctLocalities = localityMatches.filter(({ result }) =>
      result.kind !== 'locality' || !regionNames.has(`${result.countryId}:${normalizeString(result.name)}`));
    return [...relevantCountries.map((match) => ({ ...match, population: Infinity })),
      ...regionMatches, ...placeMatches.map((match) => ({ ...match, population: Infinity })), ...distinctLocalities]
      .sort((a, b) => a.rank - b.rank || b.population - a.population || a.result.name.localeCompare(b.result.name))
      .slice(0, MAX_RESULTS)
      .map(({ result }) => result);
  }

  const available = new Map(regions.map((region) => [region.id, region]));
  const matches: { result: RegionSearchResult; rank: number }[] = regions.map((region) => ({
    result: { kind: 'region' as const, id: region.id, name: region.name, countryId },
    rank: score(region.name, query) < 0 && score(region.id, query) < 0 ? Infinity : Math.min(
      score(region.name, query) < 0 ? Infinity : score(region.name, query),
      score(region.id, query) < 0 ? Infinity : score(region.id, query) + 1,
    ),
  })).filter(({ rank }) => Number.isFinite(rank));

  // One suggestion per region even when several places there match.
  if (query.length >= 3) {
    for (const place of SEARCH_PLACES) {
      if (place.countryId !== countryId || !available.has(place.regionId)) continue;
      const rank = placeScore(place, query);
      if (!Number.isFinite(rank)) continue;
      const region = available.get(place.regionId)!;
      const existing = matches.find(({ result }) => result.id === region.id);
      if (existing) {
        if (rank < existing.rank) {
          existing.rank = rank;
          existing.result = { ...existing.result, matchedPlace: place.name };
        }
      } else {
        matches.push({ result: { kind: 'region', id: region.id, name: region.name, countryId,
          matchedPlace: place.name }, rank: rank + 1 });
      }
    }
  }

  const seen = new Set<string>();
  const localities = worldPlaces.filter((place) => {
    if (place.countryId !== countryId || !Number.isFinite(localityMatchesRank(place, query))) return false;
    if (matches.some(({ result }) => normalizeString(result.name) === normalizeString(place.name))) return false;
    const key = `${normalizeString(place.name)}:${normalizeString(place.areaName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((place) => ({
    result: { kind: 'locality', id: `geo:${place.id}`, name: place.name, countryId,
      areaName: place.areaName, coordinates: place.coordinates, territoryId: place.territoryId } as SearchResult,
    rank: localityMatchesRank(place, query) + 1,
    population: place.population,
  }));

  return [...matches.map((match) => ({ ...match, population: Infinity })), ...localities]
    .sort((a, b) => a.rank - b.rank || b.population - a.population || a.result.name.localeCompare(b.result.name))
    .slice(0, MAX_RESULTS).map(({ result }) => result);
}
