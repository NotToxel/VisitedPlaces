import { useState, useEffect, useMemo } from 'react';
import { WORLD_GEO_URL } from '../config/urls';
import { getSubRegionUrl, fetchRawTopology } from '../utils/topojsonCache';
import { drilldownRegistry } from '../config/drilldownConfig';
import { getCountryGeoJSON, computeBoundingBox } from '../data/naturalEarthAdmin1';
import type { BBox } from '../data/naturalEarthAdmin1';

export function useDrilldownGeography(activeCountry: string | null, setActiveCountry: (id: string | null) => void) {
  const [geoData, setGeoData] = useState<string | object>(WORLD_GEO_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [countryBBox, setCountryBBox] = useState<BBox | null>(null);

  useEffect(() => {
    let active = true;

    // ── World view ─────────────────────────────────────────────────────
    if (!activeCountry) {
      Promise.resolve().then(() => {
        if (active) {
          setCountryBBox(null);
          setIsLoading(true);
        }
      });
      fetchRawTopology(WORLD_GEO_URL)
        .then((data) => {
          if (active && data) {
            setGeoData(data as object);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) setIsLoading(false);
        });
      return () => { active = false; };
    }

    // ── Drill-down view ────────────────────────────────────────────────
    Promise.resolve().then(() => {
      if (active) setIsLoading(true);
    });

    const curatedUrl = getSubRegionUrl(activeCountry);

    if (curatedUrl) {
      // Path A: Curated TopoJSON (USA, GBR)
      fetchRawTopology(curatedUrl)
        .then((data) => {
          if (!active) return;
          if (!data) throw new Error('No topology data');
          let processed = data as object;
          const config = drilldownRegistry[activeCountry];
          if (config?.processTopology) {
            processed = config.processTopology(JSON.parse(JSON.stringify(data))) as object;
          }
          setGeoData(processed);
          setCountryBBox(null); // Curated configs have their own scale/center
          setIsLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setIsLoading(false);
          setActiveCountry(null);
          setGeoData(WORLD_GEO_URL);
        });
    } else {
      // Path B: Natural Earth admin-1 GeoJSON
      Promise.all([
        getCountryGeoJSON(activeCountry),
        computeBoundingBox(activeCountry),
      ])
        .then(([geoJson, bbox]) => {
          if (!active) return;
          if (!geoJson || geoJson.features.length === 0) {
            setIsLoading(false);
            setActiveCountry(null);
            return;
          }
          setGeoData(geoJson);
          setCountryBBox(bbox);
          setIsLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setIsLoading(false);
          setActiveCountry(null);
        });
    }

    return () => { active = false; };
  }, [activeCountry, setActiveCountry]);

  // Compute projection scale from bounding box for StandardMap
  const autoScale = useMemo(() => {
    if (!activeCountry || !countryBBox) return null;
    const lngSpan = countryBBox.maxLng - countryBBox.minLng;
    const latSpan = countryBBox.maxLat - countryBBox.minLat;
    const maxSpan = Math.max(lngSpan, latSpan, 1);
    return Math.min(18000 / maxSpan, 24000);
  }, [activeCountry, countryBBox]);

  return { geoData, isLoading, setGeoData, countryBBox, autoScale };
}
