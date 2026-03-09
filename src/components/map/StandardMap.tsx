import React, { memo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { ArrowLeft } from 'lucide-react';

const worldGeoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

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

interface StandardMapProps {
  setTooltipContent: (content: string) => void;
  selectionMode: 'VISITED' | 'WISHLIST' | 'AVOID';
  activeCountry: string | null;
  setActiveCountry: (id: string | null) => void;
  highlightedCountry?: string | null;
  numericToA3: Record<string, string>;
}

const getFillColor = (status: PlaceStatus, isHighlighted: boolean) => {
  if (isHighlighted) return '#fbbf24';
  if (status === 'VISITED') return 'var(--accent-visited)';
  if (status === 'WISHLIST') return 'var(--accent-wishlist)';
  if (status === 'AVOID') return '#ef4444';
  return 'rgba(255, 255, 255, 0.1)';
};

const isUSA = (id?: string | null) => id === 'USA' || id === '840' || id === 'United States of America';
const isGBR = (id?: string | null) => id === 'GBR' || id === '826' || id === 'United Kingdom';

const getSubRegionUrl = (id: string) => {
    if (isUSA(id)) return 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
    if (isGBR(id)) return 'https://raw.githubusercontent.com/ONSvisual/topojson_boundaries/main/geogUACounty2019GB.json'; // Upper tier for GB
    return null; 
}

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

    setIsLoading(true);
    fetch(subRegionUrl)
       .then(res => res.json())
       .then(data => {
           setGeoData(data);
           setIsLoading(false);
       })
       .catch(err => {
           console.error("Failed to load subregion TopoJSON", err);
           setIsLoading(false);
           setActiveCountry(null); // Back out on fail
       });
  }, [activeCountry, setActiveCountry]);

  const handleCountryClick = (geo: any) => {
    const rawId = geo.properties?.ISO_A3 || geo.id || geo.properties?.name;
    const countryId = numericToA3[rawId] || rawId;
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
    const rawId = geo.properties?.ISO_A3 || geo.id || geo.properties?.name;
    const countryId = numericToA3[rawId] || rawId;
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
          scale: isUSA(activeCountry) ? 800 : (isGBR(activeCountry) ? 2500 : 147),
          center: isGBR(activeCountry) ? [-2, 54.5] : [0, 0]
        }}
        width={800}
        height={400}
        style={{ width: '100%', height: '100%', outline: 'none', opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}
      >
        <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={12}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // In world-atlas 50m, the geo.id is the numeric ISO code (ccn3)
                // We fallback to name and ISO_A3 for backwards compatibility and other sources
                const rawId = geo.properties?.ISO_A3 || geo.id || geo.properties?.LAD13CD || geo.properties?.name || geo.properties?.ctyua19cd;
                const countryId = numericToA3[rawId] || rawId;
                const placeIdForStore = activeCountry ? `${activeCountry}-${countryId}` : countryId;
                
                const status = places[placeIdForStore]?.status || 'NONE';
                const isSelected = status !== 'NONE';
                const countryName = geo.properties?.name || geo.properties?.LAD13NM || geo.properties?.ctyua19nm || 'Unknown Region';
                // For standard map the ID will usually be ISO_A3 but we only have alpha-2 for highlighting
                // Since our places list uses ISO_A3 or name, let's keep it simple and match standard ISO_A2/A3 if possible, 
                // We'll use the find function to identify highlighted match since highlightedCountry is an alpha-2 code
                const isHighlighted = highlightedCountry === (geo.properties?.ISO_A2 || geo.properties?.wb_a2 || geo.properties?.iso_a2) 
                  || highlightedCountry === countryId;

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
                    fill={getFillColor(status, isHighlighted)}
                    stroke={isHighlighted ? "#fbbf24" : "var(--bg-dark)"}
                    strokeWidth={isHighlighted ? 1.5 : (activeCountry ? 0.2 : 0.5)}
                    style={{
                      default: {
                        outline: 'none',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: isSelected ? getFillColor(status, isHighlighted) : 'rgba(255, 255, 255, 0.3)',
                        outline: 'none',
                        transition: 'fill 0.2s ease',
                        cursor: 'context-menu'
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
        </ZoomableGroup>
      </ComposableMap>
    </>
  );
};

export const StandardMap = memo(StandardMapBase);
