import { geoArea } from 'd3-geo';
import { COUNTRIES } from '../data/countries';
import { computeBBoxFromFeatures } from '../data/naturalEarthAdmin1';
import type { BBox } from '../data/naturalEarthAdmin1';

interface WorldFeature {
  id?: string | number;
  properties?: { ISO_A3?: string };
  geometry?: { type: string; coordinates?: unknown };
}

/** Pick the mainland only when it clearly dominates the country's land area. */
export function getCountryFocusBBox(countryId: string, worldData: unknown, fallback: BBox): BBox {
  const numericId = COUNTRIES.find((country) => country.id === countryId)?.ccn3;
  const features = (worldData as { features?: WorldFeature[] } | null)?.features;
  const feature = features?.find((candidate) =>
    candidate.properties?.ISO_A3 === countryId ||
    candidate.id?.toString() === countryId ||
    (numericId && candidate.id?.toString() === numericId)
  );
  const geometry = feature?.geometry;
  if (!geometry || !Array.isArray(geometry.coordinates)) return fallback;

  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  if (polygons.length === 0) return fallback;

  const ranked = polygons.map((coordinates) => {
    if (!Array.isArray(coordinates)) return { coordinates, area: 0 };
    const sphericalArea = geoArea({ type: 'Polygon', coordinates: coordinates as number[][][] });
    return { coordinates, area: Math.min(sphericalArea, 4 * Math.PI - sphericalArea) };
  }).sort((a, b) => b.area - a.area);
  const totalArea = ranked.reduce((sum, polygon) => sum + polygon.area, 0);
  const largest = ranked[0];
  if (!largest || totalArea === 0 || largest.area / totalArea < 0.7) return fallback;

  return computeBBoxFromFeatures([{
    geometry: { type: 'Polygon', coordinates: largest.coordinates },
  }]) || fallback;
}
