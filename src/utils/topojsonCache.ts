// Centralized caching logic for sub-region TopoJSON data.
// Supported: USA, GBR (United Kingdom)

export interface TopoRegion {
  id: string; // The canonical ID (e.g. E06000001 or 01)
  name: string; // The UI display name
}

const subRegionCache: Record<string, TopoRegion[]> = {};
const pendingRequests: Record<string, Promise<TopoRegion[]>> = {};

export const getSubRegionUrl = (countryA3: string): string | null => {
  if (countryA3 === 'USA') return 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
  if (countryA3 === 'GBR') return 'https://cdn.jsdelivr.net/gh/ONSdigital/uk-topojson@master/output/topo.json';
  return null; 
};

export const fetchSubRegions = async (countryA3: string): Promise<TopoRegion[]> => {
  const url = getSubRegionUrl(countryA3);
  if (!url) return [];

  if (subRegionCache[countryA3]) return subRegionCache[countryA3];
  if (pendingRequests[countryA3]) return pendingRequests[countryA3];

  const fetchPromise = fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch topology for ${countryA3}`);
      return res.json();
    })
    .then(data => {
      if (!data.objects) throw new Error('Invalid topojson structure');
      
      let regions: TopoRegion[] = [];
      
      // Handle USA
      if (countryA3 === 'USA' && data.objects.states) {
        regions = data.objects.states.geometries.map((g: any) => ({
          id: g.id,
          name: g.properties.name
        }));
      } 
      // Handle UK (utla layer)
      else if (countryA3 === 'GBR' && data.objects.utla) {
        regions = data.objects.utla.geometries.map((g: any) => ({
          id: g.properties.AREACD || g.properties.areacd || g.id,
          name: g.properties.AREANM || g.properties.areanm || g.properties.name
        }));
      }

      regions.sort((a, b) => a.name.localeCompare(b.name));
      subRegionCache[countryA3] = regions;
      return regions;
    })
    .catch(err => {
      console.error(err);
      return [];
    })
    .finally(() => {
      delete pendingRequests[countryA3];
    });

  pendingRequests[countryA3] = fetchPromise;
  return fetchPromise;
};
