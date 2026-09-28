import { useEffect, useState } from 'react';
import { getSubRegionUrl, getCachedRawTopologySync, fetchRawTopology, fetchWorldFeatureCollection, getCachedWorldFeatureCollectionSync } from '../utils/topojsonCache';
import { drilldownRegistry } from '../config/drilldownConfig';
import { getCountryGeoJSON, computeBoundingBox, getPreloadedCountryDataSync } from '../data/naturalEarthAdmin1';
import type { BBox } from '../data/naturalEarthAdmin1';

const EMPTY_GEOGRAPHY = { type: 'FeatureCollection', features: [] };

interface GeographyView {
  countryId: string | null;
  geoData: object;
  isLoading: boolean;
  countryBBox: BBox | null;
}

function cachedView(countryId: string | null): GeographyView {
  if (!countryId) {
    const world = getCachedWorldFeatureCollectionSync();
    return { countryId: null, geoData: world || EMPTY_GEOGRAPHY, isLoading: !world, countryBBox: null };
  }
  const curatedUrl = getSubRegionUrl(countryId);
  if (curatedUrl) {
    const raw = getCachedRawTopologySync(curatedUrl);
    if (raw) {
      const config = drilldownRegistry[countryId];
      const geoData = config?.processTopology
        ? config.processTopology(JSON.parse(JSON.stringify(raw)))
        : raw as object;
      return { countryId, geoData, isLoading: false, countryBBox: null };
    }
  } else {
    const cached = getPreloadedCountryDataSync(countryId);
    if (cached) {
      return { countryId, geoData: cached.geoJson, isLoading: false, countryBBox: cached.bbox };
    }
  }
  return { countryId, geoData: EMPTY_GEOGRAPHY, isLoading: true, countryBBox: null };
}

export function useDrilldownGeography(activeCountry: string | null, setActiveCountry: (id: string | null) => void) {
  const [loadedView, setLoadedView] = useState<GeographyView>(() => cachedView(activeCountry));

  // State updates happen after render. Never expose geometry or bounds from the
  // previous country during the intervening render after activeCountry changes.
  const view = loadedView.countryId === activeCountry ? loadedView : cachedView(activeCountry);

  useEffect(() => {
    let active = true;
    const initial = cachedView(activeCountry);
    Promise.resolve().then(() => {
      if (active) setLoadedView(initial);
    });

    if (!activeCountry) {
      if (initial.isLoading) {
        fetchWorldFeatureCollection()
          .then((world) => {
            if (active) setLoadedView({ countryId: null, geoData: world || EMPTY_GEOGRAPHY, isLoading: false, countryBBox: null });
          })
          .catch(() => {
            if (active) setLoadedView({ countryId: null, geoData: EMPTY_GEOGRAPHY, isLoading: false, countryBBox: null });
          });
      }
      return () => { active = false; };
    }

    if (!initial.isLoading) return () => { active = false; };

    const curatedUrl = getSubRegionUrl(activeCountry);
    if (curatedUrl) {
      fetchRawTopology(curatedUrl)
        .then((data) => {
          if (!active) return;
          if (!data) throw new Error('No topology data');
          const config = drilldownRegistry[activeCountry];
          const processed = config?.processTopology
            ? config.processTopology(JSON.parse(JSON.stringify(data)))
            : data as object;
          setLoadedView({ countryId: activeCountry, geoData: processed, isLoading: false, countryBBox: null });
        })
        .catch(() => {
          if (active) setActiveCountry(null);
        });
    } else {
      Promise.all([getCountryGeoJSON(activeCountry), computeBoundingBox(activeCountry)])
        .then(([geoJson, bbox]) => {
          if (!active) return;
          if (!geoJson?.features.length || !bbox) {
            setActiveCountry(null);
            return;
          }
          setLoadedView({ countryId: activeCountry, geoData: geoJson, isLoading: false, countryBBox: bbox });
        })
        .catch(() => {
          if (active) setActiveCountry(null);
        });
    }

    return () => { active = false; };
  }, [activeCountry, setActiveCountry]);

  return view;
}
