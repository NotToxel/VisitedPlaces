import { describe, expect, it } from 'vitest';
import { isMultiRegionLocality, searchMapPlaces } from './placeSearch';
import type { WorldPlace } from './worldPlaceIndex';
import regionRows from '../data/regionSearchIndex.json';

describe('map place search', () => {
  const spanishRegions = [
    { id: 'ESP-TF', name: 'Santa Cruz de Tenerife (Canary Islands)' },
    { id: 'ESP-ES-PM', name: 'Baleares' },
    { id: 'ESP-ES-MA', name: 'Málaga' },
  ];

  it('keeps world suggestions short and finds a place without loading global region data', () => {
    const results = searchMapPlaces('Tenerife', null, []);
    expect(results).toContainEqual({ kind: 'place', id: 'ESP:Tenerife', name: 'Tenerife',
      countryId: 'ESP', regionId: 'ESP-TF', regionName: 'Santa Cruz de Tenerife (Canary Islands)' });
    expect(results).toHaveLength(1);
    expect(searchMapPlaces('a', null, [])).toHaveLength(5);
  });

  it('resolves an alias to an available region and shows one row for that region', () => {
    expect(searchMapPlaces('Majorca', 'ESP', spanishRegions)).toEqual([
      { kind: 'region', id: 'ESP-ES-PM', name: 'Baleares', countryId: 'ESP', matchedPlace: 'Mallorca' },
    ]);
    expect(searchMapPlaces('Ibi', 'ESP', spanishRegions)).toHaveLength(1);
  });

  it('does not suggest an alias when its region is missing from the loaded geography', () => {
    expect(searchMapPlaces('Tenerife', 'ESP', [{ id: 'ESP-ES-MA', name: 'Málaga' }])).toEqual([]);
  });

  it('ranks an exact region name before a matching place', () => {
    expect(searchMapPlaces('Bali', 'IDN', [{ id: 'IDN-ID-BA', name: 'Bali' }])[0]).toMatchObject({
      kind: 'region', id: 'IDN-ID-BA', name: 'Bali',
    });
  });

  it('ranks worldwide city matches by population and limits the dropdown', () => {
    const city = (id: number, countryId: string, population: number): WorldPlace => ({
      id, name: 'Paris', asciiName: '', countryId, areaName: 'Region',
      coordinates: [0, 0], population,
    });
    const results = searchMapPlaces('Paris', null, [], [
      city(1, 'USA', 20000), city(2, 'FRA', 2000000), city(3, 'CAN', 10000),
    ]);
    expect(results.map((result) => result.kind === 'locality' ? result.countryId : '')).toEqual(['FRA', 'USA', 'CAN']);
    expect(isMultiRegionLocality('GBR', 'London')).toBe(true);
    expect(isMultiRegionLocality('FRA', 'Paris')).toBe(false);
  });

  it('keeps a matching official region above a city with the same name', () => {
    const paris: WorldPlace = { id: 2, name: 'Paris', asciiName: '', countryId: 'FRA',
      areaName: 'Île-de-France', coordinates: [2.35, 48.86], population: 2000000 };
    expect(searchMapPlaces('Paris', 'FRA', [{ id: 'FRA-FR-75', name: 'Paris' }], [paris])).toEqual([
      { kind: 'region', id: 'FRA-FR-75', name: 'Paris', countryId: 'FRA' },
    ]);
  });

  it('finds a named sub-region from the world map without opening its country first', () => {
    const worldRegions = regionRows.map(([countryId, id, name]) => ({ countryId, id, name }));
    expect(searchMapPlaces('Richmond upon Thames', null, [], [], worldRegions)[0]).toEqual({
      kind: 'region', countryId: 'GBR', id: 'GBR-GB-RIC', name: 'Richmond upon Thames',
    });
  });
});
