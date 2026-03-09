import React, { memo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { ArrowLeft } from 'lucide-react';
import { getSubRegionUrl } from '../../utils/topojsonCache';

// explicitly rendered dots for entities smaller than SVG precision at 800px width
const MICROSTATES = [
  { id: 'VAT', name: 'Vatican City', coordinates: [12.4534, 41.9029] },
  { id: 'MCO', name: 'Monaco', coordinates: [7.4202, 43.7384] },
  { id: 'SMR', name: 'San Marino', coordinates: [12.4578, 43.9424] },
  { id: 'LIE', name: 'Liechtenstein', coordinates: [9.5209, 47.1660] },
  { id: 'AND', name: 'Andorra', coordinates: [1.5218, 42.5063] },
  { id: 'NRU', name: 'Nauru', coordinates: [166.9315, -0.5228] },
  { id: 'TUV', name: 'Tuvalu', coordinates: [179.1940, -8.5137] },
  { id: 'SYC', name: 'Seychelles', coordinates: [55.4920, -4.6796] },
  { id: 'MUS', name: 'Mauritius', coordinates: [57.5522, -20.3484] },
  { id: 'MDV', name: 'Maldives', coordinates: [73.2207, 3.2028] },
  { id: 'SGP', name: 'Singapore', coordinates: [103.8198, 1.3521] },
  { id: 'BHR', name: 'Bahrain', coordinates: [50.5577, 26.0667] },
  { id: 'MLT', name: 'Malta', coordinates: [14.4326, 35.9375] },
  { id: 'BRB', name: 'Barbados', coordinates: [-59.5432, 13.1939] },
  { id: 'ATG', name: 'Antigua and Barbuda', coordinates: [-61.7964, 17.0608] },
  { id: 'KNA', name: 'Saint Kitts and Nevis', coordinates: [-62.7829, 17.3578] },
  { id: 'GRD', name: 'Grenada', coordinates: [-61.6067, 12.1165] },
  { id: 'VCT', name: 'Saint Vincent and the Grenadines', coordinates: [-61.2225, 13.2528] },
  { id: 'LCA', name: 'Saint Lucia', coordinates: [-60.9789, 13.9094] },
  { id: 'FSM', name: 'Federated States of Micronesia', coordinates: [158.1499, 6.9147] },
  { id: 'MHL', name: 'Marshall Islands', coordinates: [171.1845, 7.1315] },
  { id: 'PLW', name: 'Palau', coordinates: [134.5825, 7.5149] },
  // Overseas Territories examples
  { id: 'BMU', name: 'Bermuda', coordinates: [-64.7505, 32.3078] },
  { id: 'FLK', name: 'Falkland Islands', coordinates: [-59.5236, -51.7963] },
  { id: 'GIB', name: 'Gibraltar', coordinates: [-5.3536, 36.1408] },
  { id: 'SHN', name: 'Saint Helena', coordinates: [-5.7089, -15.9650] }
];

// UK Crown Dependencies and Overseas Territories — shown as markers in the UK drill-down view
const UK_TERRITORIES = [
  { id: 'JEY', name: 'Jersey', coordinates: [-2.1358, 49.2144] },
  { id: 'GGY', name: 'Guernsey', coordinates: [-2.5853, 49.4657] },
  { id: 'IMN', name: 'Isle of Man', coordinates: [-4.5481, 54.2361] },
  { id: 'GIB', name: 'Gibraltar', coordinates: [-5.3536, 36.1408] },
  { id: 'BMU', name: 'Bermuda', coordinates: [-64.7505, 32.3078] },
  { id: 'FLK', name: 'Falkland Islands', coordinates: [-59.5236, -51.7963] },
  { id: 'SHN', name: 'Saint Helena', coordinates: [-5.7089, -15.9650] },
  { id: 'CYM', name: 'Cayman Islands', coordinates: [-81.2546, 19.3133] },
  { id: 'TCA', name: 'Turks and Caicos', coordinates: [-71.7979, 21.6820] },
  { id: 'VGB', name: 'British Virgin Islands', coordinates: [-64.6395, 18.4207] },
  { id: 'AIA', name: 'Anguilla', coordinates: [-63.0501, 18.2206] },
  { id: 'MSR', name: 'Montserrat', coordinates: [-62.1875, 16.7425] },
  { id: 'IOT', name: 'British Indian Ocean Territory', coordinates: [72.3735, -7.3696] },
  { id: 'PCN', name: 'Pitcairn Islands', coordinates: [-128.3242, -24.3768] },
  { id: 'SGS', name: 'South Georgia', coordinates: [-36.5879, -54.4296] }
];

interface StandardMapProps {
  setTooltipContent: (content: string) => void;
  selectionMode: 'VISITED' | 'WISHLIST' | 'AVOID';
  activeCountry: string | null;
  setActiveCountry: (id: string | null) => void;
  highlightedCountry?: string | null;
  numericToA3: Record<string, string>;
}

const getFillColor = (status: PlaceStatus, isHighlighted: boolean, isSubRegion = false) => {
  if (isHighlighted) return '#fbbf24';
  if (status === 'VISITED') return 'var(--accent-visited)';
  if (status === 'WISHLIST') return 'var(--accent-wishlist)';
  if (status === 'AVOID') return '#ef4444';
  // Sub-region drill-down needs a brighter fill so regions are visible on the dark background
  return isSubRegion ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.1)';
};

const isUSA = (id?: string | null) => id === 'USA' || id === '840' || id === 'United States of America';
const getRegionId = (geo: any, numericToA3: Record<string, string>, activeCountry: string | null) => {
  if (activeCountry === 'GBR') {
     return geo.properties?.AREACD || geo.properties?.areacd || geo.id;
  }
  if (activeCountry === 'USA') {
     return geo.id;
  }
  const rawId = geo.properties?.ISO_A3 || geo.id;
  return numericToA3[rawId] || rawId;
};

const worldGeoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

const StandardMapBase: React.FC<StandardMapProps> = ({ setTooltipContent, selectionMode, activeCountry, setActiveCountry, highlightedCountry, numericToA3 }) => {
  const { places, setCountryStatus } = useStore();
  const [geoData, setGeoData] = useState<string | object>(worldGeoUrl);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeCountry) {
        setGeoData(worldGeoUrl);
        return;
    }

    const subRegionUrl = getSubRegionUrl(activeCountry);
    if (!subRegionUrl) {
       // If no subregion map is available for this country, stay on the world map but log an info message.
       console.log("No high-res subregion map available for", activeCountry);
       return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    fetch(subRegionUrl, { signal: controller.signal })
       .then(res => {
           if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
           return res.json();
       })
       .then(data => {
           if (!data.objects) throw new Error("Invalid TopoJSON: missing objects property");
           // If UK, we need to force react-simple-maps to use 'utla' (Upper Tier Local Authorities) 
           // by removing all the other geometry collections from the topoJSON root so it defaults correctly.
           if (activeCountry === 'GBR' && data.objects && data.objects.utla) {
               data.objects = { default: data.objects.utla };
           }
           setGeoData(data);
           setIsLoading(false);
       })
       .catch(err => {
           if (err.name === 'AbortError') return;
           console.error("Failed to load subregion TopoJSON", err);
           setIsLoading(false);
           setActiveCountry(null); // Back out on fail
           setGeoData(worldGeoUrl); // Ensure world map is restored
       });
       
    return () => {
      controller.abort();
    };
  }, [activeCountry, setActiveCountry]);

  const handleCountryClick = (geo: any) => {
    const countryId = getRegionId(geo, numericToA3, activeCountry);
    if (!countryId) return;

    const placeIdForStore = activeCountry ? `${activeCountry}-${countryId}` : countryId;
    const currentStatus = places[placeIdForStore]?.status || 'NONE';
    
    if (currentStatus === selectionMode) {
      setCountryStatus(placeIdForStore, 'NONE');
    } else {
      setCountryStatus(placeIdForStore, selectionMode);
    }
  };

  const handleRightClick = (e: React.MouseEvent, geo: any) => {
    e.preventDefault();
    const countryId = getRegionId(geo, numericToA3, activeCountry);
    if (!countryId || activeCountry) return;

    if (getSubRegionUrl(countryId)) {
        setActiveCountry(countryId);
    } else {
        setTooltipContent(`No sub-regions available for ${geo.properties.name}`);
        setTimeout(() => setTooltipContent(''), 2000);
    }
  };

  return (
    <>
      {activeCountry && (
         <button 
           onClick={() => setActiveCountry(null)}
           className="glass-button"
           style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 50, background: 'rgba(0,0,0,0.5)' }}
         >
             <ArrowLeft size={16} /> Back to World
         </button>
      )}

      {isLoading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 60, color: 'var(--text-secondary)' }}>
              Loading Sub-regions...
          </div>
      )}

      <ComposableMap
        projection={isUSA(activeCountry) ? "geoAlbersUsa" : "geoMercator"}
        projectionConfig={{ 
          scale: activeCountry === 'USA' ? 800 : (activeCountry === 'GBR' ? 3200 : 147),
          center: activeCountry === 'GBR' ? [-2, 54.5] : [0, 0]
        }}
        width={800}
        height={500}
        style={{ width: '100%', height: '100%', outline: 'none', opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}
      >
        <ZoomableGroup 
          center={[0, 0]} 
          zoom={1} 
          minZoom={0.5} 
          maxZoom={24}
        >
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // In world-atlas 50m, the geo.id is the numeric ISO code (ccn3)
                  // We fallback to name and ISO_A3 for backwards compatibility and other sources
                  // For ONS uk topojson, the ID is areacd and name is areanm
                  const countryId = getRegionId(geo, numericToA3, activeCountry);
                  const placeIdForStore = activeCountry ? `${activeCountry}-${countryId}` : countryId;
                  
                  const status = places[placeIdForStore]?.status || 'NONE';
                const isSelected = status !== 'NONE';
                const countryName = geo.properties?.AREANM || geo.properties?.areanm || geo.properties?.name || 'Unknown Region';
                // For standard map the ID will usually be ISO_A3 but we only have alpha-2 for highlighting
                // Since our places list uses ISO_A3 or name, let's keep it simple and match standard ISO_A2/A3 if possible, 
                // We'll use the find function to identify highlighted match since highlightedCountry is an alpha-2 code
                const isHighlighted = !!highlightedCountry && (
                  highlightedCountry === (geo.properties?.ISO_A2 || geo.properties?.wb_a2 || geo.properties?.iso_a2 || geo.properties?.areacd) 
                  || highlightedCountry === countryId
                  // Also match numeric IDs against alpha-2 codes for world-atlas 50m
                  || (geo.id && numericToA3[geo.id] && highlightedCountry === geo.properties?.ISO_A2)
                );

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      setTooltipContent(`${countryName}${isSelected ? ` - ${status}` : ''}`);
                    }}
                    onMouseLeave={() => {
                      setTooltipContent('');
                    }}
                    onClick={() => handleCountryClick(geo)}
                    onContextMenu={(e) => handleRightClick(e, geo)}
                    fill={getFillColor(status, isHighlighted, !!activeCountry)}
                     stroke={isHighlighted ? "#fbbf24" : (activeCountry ? 'rgba(255,255,255,0.3)' : 'var(--bg-dark)')}
                     strokeWidth={isHighlighted ? 1.5 : (activeCountry ? 0.5 : 0.5)}
                     style={{
                       default: {
                         fill: getFillColor(status, isHighlighted, !!activeCountry),
                         opacity: 1,
                         outline: 'none',
                         transition: 'all 0.2s ease',
                       },
                       hover: {
                         fill: getFillColor(status, isHighlighted, !!activeCountry),
                         opacity: 0.75,
                         outline: 'none',
                         transition: 'opacity 0.2s ease',
                         cursor: 'pointer'
                       },
                       pressed: {
                         fill: 'var(--accent-primary)',
                         outline: 'none',
                       },
                     }}
                  />
                );
              })
            }
          </Geographies>

          {/* Render explicit markers for microstates on the global level */}
          {!activeCountry && MICROSTATES.map((marker) => {
            const status = places[marker.id]?.status || 'NONE';
            const isSelected = status !== 'NONE';
            const isHighlighted = highlightedCountry === marker.id;
            
            return (
              <Marker 
                key={marker.id} 
                coordinates={marker.coordinates as [number, number]}
                onClick={() => {
                  if (status === selectionMode) {
                    setCountryStatus(marker.id, 'NONE');
                  } else {
                    setCountryStatus(marker.id, selectionMode);
                  }
                }}
                onMouseEnter={() => {
                  setTooltipContent(`${marker.name}${isSelected ? ` - ${status}` : ''}`);
                }}
                onMouseLeave={() => {
                  setTooltipContent('');
                }}
              >
                <circle 
                  cx={0} 
                  cy={0} 
                  r={isHighlighted ? 4 : 2.5} 
                  fill={getFillColor(status, isHighlighted)} 
                  stroke={isHighlighted ? "#fff" : "var(--bg-dark)"}
                  strokeWidth={0.5}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                />
              </Marker>
            );
          })}
          {/* Map markers for territories shouldn't be rendered if we have an inset */}
          {activeCountry === 'GBR' && null}
        </ZoomableGroup>
      </ComposableMap>

      {/* Inline UK Territories Side Panel */}
      {activeCountry === 'GBR' && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '280px',
          maxHeight: 'calc(100% - 2rem)',
          overflowY: 'auto',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          paddingRight: '0.5rem', // For scrollbar
          pointerEvents: 'none' // Let clicks pass through empty space
        }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '0.75rem', borderRadius: '8px', pointerEvents: 'auto', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crown Dependencies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {UK_TERRITORIES.slice(0, 3).map(territory => {
                const status = places[territory.id]?.status || 'NONE';
                return (
                  <div key={territory.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: `3px solid ${status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : status === 'AVOID' ? '#ef4444' : 'transparent'}` }}>
                    <span style={{ fontSize: '0.85rem' }}>{territory.name}</span>
                    <button 
                      onClick={() => setCountryStatus(territory.id, status === selectionMode ? 'NONE' : selectionMode)}
                      title={`Toggle ${selectionMode}`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: status === 'NONE' ? 'rgba(255,255,255,0.3)' : (status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : '#ef4444'), padding: 0 }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'currentColor' }} />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <h3 style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overseas Territories</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {UK_TERRITORIES.slice(3).map(territory => {
                const status = places[territory.id]?.status || 'NONE';
                return (
                  <div key={territory.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: `3px solid ${status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : status === 'AVOID' ? '#ef4444' : 'transparent'}` }}>
                     <span style={{ fontSize: '0.85rem' }}>{territory.name === 'British Indian Ocean Territory' ? 'Brit. Indian Ocean Terr.' : territory.name === 'South Georgia' ? 'South Georgia & S.S' : territory.name}</span>
                     <button 
                      onClick={() => setCountryStatus(territory.id, status === selectionMode ? 'NONE' : selectionMode)}
                      title={`Toggle ${selectionMode}`}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: status === 'NONE' ? 'rgba(255,255,255,0.3)' : (status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : '#ef4444'), padding: 0 }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'currentColor' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const StandardMap = memo(StandardMapBase);
