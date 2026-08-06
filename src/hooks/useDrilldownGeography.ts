import { useState, useEffect, useMemo } from 'react';
import { getSubRegionUrl, fetchRawTopology, fetchWorldFeatureCollection, getCachedWorldFeatureCollectionSync } from '../utils/topojsonCache';
import { drilldownRegistry } from '../config/drilldownConfig';

import { getCountryGeoJSON, computeBoundingBox, getPreloadedCountryDataSync, computeAutoScale } from '../data/naturalEarthAdmin1';
import type { BBox } from '../data/naturalEarthAdmin1';

import { useStore } from '../store/useStore';

export function useDrilldownGeography(activeCountry: string | null, setActiveCountry: (id: string | null) => void) {
  const { neDataLoaded } = useStore();
  const [geoData, setGeoData] = useState<string | object>(() => {
    if (!activeCountry) {
      return getCachedWorldFeatureCollectionSync() || { type: 'FeatureCollection', features: [] };
    }
    const sync = getPreloadedCountryDataSync(activeCountry);
    return sync ? sync.geoJson : { type: 'FeatureCollection', features: [] };
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!activeCountry) return !getCachedWorldFeatureCollectionSync();
    return !getPreloadedCountryDataSync(activeCountry);
  });
  const [countryBBox, setCountryBBox] = useState<BBox | null>(() => {
    if (!activeCountry) return null;
    const sync = getPreloadedCountryDataSync(activeCountry);
    return sync ? sync.bbox : null;
  });

  useEffect(() => {
    let active = true;

    // ── World view ─────────────────────────────────────────────────────
    if (!activeCountry) {
      const cached = getCachedWorldFeatureCollectionSync();
      Promise.resolve().then(() => {
        if (!active) return;
        setCountryBBox(null);
        if (cached) {
          setGeoData(cached);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      });

      if (!cached) {
        fetchWorldFeatureCollection()
          .then((fc) => {
            if (active && fc) {
              setGeoData(fc);
              setIsLoading(false);
            }
          })
          .catch(() => {
            if (active) setIsLoading(false);
          });
      }
      return () => { active = false; };
    }


    // ── Drill-down view ────────────────────────────────────────────────
    const preloadedSync = getPreloadedCountryDataSync(activeCountry);
    if (preloadedSync) {
      Promise.resolve().then(() => {
        if (active) {
          setGeoData(preloadedSync.geoJson);
          setCountryBBox(preloadedSync.bbox);
          setIsLoading(false);
        }
      });
      return () => { active = false; };
    }

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
          setGeoData(getCachedWorldFeatureCollectionSync() || {});
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
  }, [activeCountry, setActiveCountry, neDataLoaded]);

  // Compute projection scale from bounding box for StandardMap (Mercator-aware)
  const autoScale = useMemo(() => {
    if (!activeCountry || !countryBBox) return null;
    return computeAutoScale(countryBBox);
  }, [activeCountry, countryBBox]);

  return { geoData, isLoading, setGeoData, countryBBox, autoScale };
}
