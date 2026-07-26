import { useState, useEffect, useMemo } from 'react';
import { WORLD_GEO_URL } from '../config/urls';
import { getSubRegionUrl, fetchRawTopology } from '../utils/topojsonCache';
import { drilldownRegistry } from '../config/drilldownConfig';
import { getCountryGeoJSON, computeBoundingBox, getPreloadedCountryDataSync, computeAutoScale } from '../data/naturalEarthAdmin1';
import type { BBox } from '../data/naturalEarthAdmin1';

import * as topojson from 'topojson-client';
import { useStore } from '../store/useStore';
import { getKosovoWorldFeature } from '../data/naturalEarthAdmin1';

export function useDrilldownGeography(activeCountry: string | null, setActiveCountry: (id: string | null) => void) {
  const { neDataLoaded } = useStore();
  const [geoData, setGeoData] = useState<string | object>(() => {
    if (!activeCountry) return WORLD_GEO_URL;
    const sync = getPreloadedCountryDataSync(activeCountry);
    return sync ? sync.geoJson : { type: 'FeatureCollection', features: [] };
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!activeCountry) return true;
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
      Promise.resolve().then(() => {
        if (active) {
          setCountryBBox(null);
          setIsLoading(true);
        }
      });
      fetchRawTopology(WORLD_GEO_URL)
        .then((data) => {
          if (active && data) {
            try {
              const topoCopy = JSON.parse(JSON.stringify(data));
              const topoData = topoCopy as unknown as Parameters<typeof topojson.feature>[0];
              const topoObj = (topoCopy as { objects?: Record<string, unknown> })?.objects?.countries;
              if (topoObj && Array.isArray((topoObj as { geometries?: unknown[] }).geometries)) {
                type TopoGeom = { id?: string | number; arcs?: number[][]; properties?: Record<string, unknown> };
                const geoms = (topoObj as { geometries: TopoGeom[] }).geometries;
                
                // 1. Tag Somaliland geometry as SOL
                const solGeom = geoms.find((g) => g.properties?.name === 'Somaliland');
                if (solGeom) {
                  solGeom.id = 'SOL';
                  solGeom.properties = { ...solGeom.properties, ISO_A3: 'SOL', name: 'Somaliland' };
                }

                // 2. Adjust Somalia (706) arcs so it only covers Somalia proper (no overlap with Somaliland)
                const somGeom = geoms.find((g) => g.id === '706' || g.id === 706);
                if (somGeom) {
                  somGeom.arcs = [[112, 113, 114, -583, -581, 583]];
                }

                type WorldFeature = { id?: string | number; properties?: { ISO_A3?: string; name?: string } };
                const fc = topojson.feature(topoData, topoObj as Parameters<typeof topojson.feature>[1]) as unknown as { type: string; features: WorldFeature[] };
                
                const kosovoFeature = getKosovoWorldFeature();
                if (kosovoFeature && !fc.features.some((f) => f.id === 'XKX' || f.properties?.ISO_A3 === 'XKX')) {
                  fc.features.push(kosovoFeature as unknown as WorldFeature);
                }

                const solFeature = fc.features.find((f) => f.properties?.name === 'Somaliland');
                if (solFeature) {
                  solFeature.id = 'SOL';
                  solFeature.properties = { ...solFeature.properties, ISO_A3: 'SOL', name: 'Somaliland' };
                }
                
                setGeoData(fc);
              } else {
                setGeoData(data as object);
              }
            } catch {
              setGeoData(data as object);
            }
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) setIsLoading(false);
        });
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
  }, [activeCountry, setActiveCountry, neDataLoaded]);

  // Compute projection scale from bounding box for StandardMap (Mercator-aware)
  const autoScale = useMemo(() => {
    if (!activeCountry || !countryBBox) return null;
    return computeAutoScale(countryBBox);
  }, [activeCountry, countryBBox]);

  return { geoData, isLoading, setGeoData, countryBBox, autoScale };
}
