import { describe, expect, it } from 'vitest';
import { geoMercator, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import worldTopology from '../../public/countries-110m.json';
import { computeAutoScale, computeBBoxFromFeatures } from './naturalEarthAdmin1';
import type { NEFeature } from './naturalEarthAdmin1';

function pointFeature(lng: number, lat: number): NEFeature {
  return {
    type: 'Feature',
    properties: { adm0_a3: 'TST', iso_3166_2: 'TST-1', name: 'Test', type_en: 'Region', admin: 'Test' },
    geometry: { type: 'MultiPoint', coordinates: [[lng, lat]] },
  };
}

describe('country drill-down bounds', () => {
  it.each([
    ['Australia and its eastern islands', [113, 154, 167], -25, 54],
    ['United States and Aleutian islands', [-125, -66, -170, 179], 40, 115],
    ['Russia across the antimeridian', [30, 170, -179], 55, 151],
    ['Fiji on both sides of the antimeridian', [177, -179], -18, 4],
  ])('%s keeps its longitude range together', (_name, longitudes, lat, expectedSpan) => {
    const bbox = computeBBoxFromFeatures(longitudes.map((lng) => pointFeature(lng, lat)));
    expect(bbox).not.toBeNull();
    expect(bbox!.maxLng - bbox!.minLng).toBeCloseTo(expectedSpan, 5);
    expect(computeAutoScale({ ...bbox!, minLat: lat - 2, maxLat: lat + 2 })).toBeGreaterThan(0);
  });

  it('centers the rendered Mercator latitude, including high-latitude countries', () => {
    const bbox = computeBBoxFromFeatures([
      pointFeature(30, 50),
      pointFeature(170, 75),
      pointFeature(-179, 75),
    ]);
    expect(bbox).not.toBeNull();
    const projection = geoMercator().scale(computeAutoScale(bbox!))
      .center([0, bbox!.centerLat]).rotate([-bbox!.centerLng, 0, 0]);
    const north = projection([bbox!.centerLng, bbox!.maxLat]);
    const south = projection([bbox!.centerLng, bbox!.minLat]);
    const center = projection([bbox!.centerLng, bbox!.centerLat]);
    expect((north![1] + south![1]) / 2).toBeCloseTo(center![1], 5);
  });

  it('produces a finite, centered view for every bundled world geometry', () => {
    const topology = worldTopology as unknown as Parameters<typeof topojson.feature>[0];
    const countries = topojson.feature(topology, topology.objects.countries) as GeoJSON.FeatureCollection;
    const overflow: string[] = [];
    for (const country of countries.features) {
      const bbox = computeBBoxFromFeatures([country as unknown as NEFeature]);
      expect(bbox, `country ${country.id}`).not.toBeNull();
      const scale = computeAutoScale(bbox!);
      expect(Number.isFinite(scale), `country ${country.id}`).toBe(true);
      const projection = geoMercator().scale(scale).translate([400, 250])
        .center([0, bbox!.centerLat]).rotate([-bbox!.centerLng, 0, 0]);
      const [[left, top], [right, bottom]] = geoPath(projection).bounds(country);
      if (![left, top, right, bottom].every(Number.isFinite) || right - left > 820 || bottom - top > 520) {
        overflow.push(String(country.id));
      }
    }
    expect(overflow).toEqual([]);
  });
});
