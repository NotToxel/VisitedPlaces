import { useState, useEffect } from 'react';
import { WORLD_GEO_URL } from '../config/constants';
import { getSubRegionUrl, fetchRawTopology } from '../utils/topojsonCache';
import { drilldownRegistry } from '../config/drilldownConfig';

export function useDrilldownGeography(activeCountry: string | null, setActiveCountry: (id: string | null) => void) {
  const [geoData, setGeoData] = useState<string | object>(WORLD_GEO_URL);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!activeCountry) {
        Promise.resolve().then(() => {
            if (active) setIsLoading(true);
        });
        fetchRawTopology(WORLD_GEO_URL)
          .then(data => {
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

    const subRegionUrl = getSubRegionUrl(activeCountry);
    if (!subRegionUrl) return;

    Promise.resolve().then(() => {
        if (active) setIsLoading(true);
    });

    fetchRawTopology(subRegionUrl)
       .then(data => {
           if (!active) return;
           if (!data) throw new Error('No topology data');
           let processed = data as object;
           // Look up any custom TopoJSON processing rules from the Global registry
           const config = drilldownRegistry[activeCountry];
           if (config && config.processTopology) {
               processed = config.processTopology(JSON.parse(JSON.stringify(data))) as object;
           }
           setGeoData(processed);
           setIsLoading(false);
       })
       .catch(() => {
           if (!active) return;
           setIsLoading(false);
           setActiveCountry(null);
           setGeoData(WORLD_GEO_URL);
       });
       
    return () => { active = false; };
  }, [activeCountry, setActiveCountry]);

  return { geoData, isLoading, setGeoData };
}
