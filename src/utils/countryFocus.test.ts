import { describe, expect, it } from 'vitest';
import * as topojson from 'topojson-client';
import worldTopology from '../../public/countries-110m.json';
import { computeBBoxFromFeatures } from '../data/naturalEarthAdmin1';
import { getCountryFocusBBox } from './countryFocus';

const topology = worldTopology as unknown as Parameters<typeof topojson.feature>[0];
const world = topojson.feature(topology, topology.objects.countries) as GeoJSON.FeatureCollection;

function fullBounds(numericId: string) {
  const feature = world.features.find((country) => country.id === numericId);
  if (!feature) throw new Error(`Missing bundled country ${numericId}`);
  const bbox = computeBBoxFromFeatures([feature as Parameters<typeof computeBBoxFromFeatures>[0][number]]);
  if (!bbox) throw new Error(`Missing bounds for ${numericId}`);
  return bbox;
}

describe('country entry focus', () => {
  it.each([
    ['CAN', '124', 50, 65],
    ['USA', '840', 30, 45],
    ['AUS', '036', -30, -20],
    ['RUS', '643', 50, 70],
  ])('centers %s on its dominant mainland', (countryId, numericId, minLat, maxLat) => {
    const fallback = fullBounds(numericId);
    const focus = getCountryFocusBBox(countryId, world, fallback);
    expect(focus.centerLat).toBeGreaterThan(minLat);
    expect(focus.centerLat).toBeLessThan(maxLat);
    expect(focus.maxLat - focus.minLat).toBeLessThanOrEqual(fallback.maxLat - fallback.minLat);
  });

  it('keeps all major islands in the entry view for an archipelago', () => {
    const fallback = fullBounds('360');
    expect(getCountryFocusBBox('IDN', world, fallback)).toBe(fallback);
  });
});
