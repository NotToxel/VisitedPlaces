import { useState, useEffect } from 'react';
import { WORLD_GEO_URL } from '../config/constants';
import { getSubRegionUrl } from '../utils/topojsonCache';
import { drilldownRegistry } from '../config/drilldownConfig';

export function useDrilldownGeography(activeCountry: string | null, setActiveCountry: (id: string | null) => void) {
  const [geoData, setGeoData] = useState<string | object>(WORLD_GEO_URL);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeCountry) {
        setGeoData(WORLD_GEO_URL);
        return;
    }

    const subRegionUrl = getSubRegionUrl(activeCountry);
    if (!subRegionUrl) return;

    const controller = new AbortController();
    setIsLoading(true);
    fetch(subRegionUrl, { signal: controller.signal })
       .then(res => res.json())
       .then(data => {
           // Look up any custom TopoJSON processing rules from the Global registry
           const config = drilldownRegistry[activeCountry];
           if (config && config.processTopology) {
               data = config.processTopology(data);
           }
           setGeoData(data);
           setIsLoading(false);
       })
       .catch(err => {
           if (err.name === 'AbortError') return;
           setIsLoading(false);
           setActiveCountry(null);
           setGeoData(WORLD_GEO_URL);
       });
       
    return () => controller.abort();
  }, [activeCountry, setActiveCountry]);

  return { geoData, isLoading, setGeoData };
}
