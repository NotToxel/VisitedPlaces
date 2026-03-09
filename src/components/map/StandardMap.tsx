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
  { id: 'BMU', name: 'Bermuda', coordinates: [-64.7505, 32.3078] },
  { id: 'FLK', name: 'Falkland Islands', coordinates: [-59.5236, -51.7963] },
  { id: 'GIB', name: 'Gibraltar', coordinates: [-5.3536, 36.1408] },
  { id: 'SHN', name: 'Saint Helena', coordinates: [-5.7089, -15.9650] }
];

// UK Crown Dependencies and Overseas Territories
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
  return isSubRegion ? 'var(--map-fill-hover)' : 'var(--map-fill-unselected)';
};

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
    if (!subRegionUrl) return;

    const controller = new AbortController();
    setIsLoading(true);
    fetch(subRegionUrl, { signal: controller.signal })
       .then(res => res.json())
       .then(data => {
           if (activeCountry === 'GBR' && data.objects && data.objects.utla) {
               data.objects = { default: data.objects.utla };
           } else if (activeCountry === 'USA' && data.objects && data.objects.states) {
               data.objects = { default: data.objects.states };
           }
           setGeoData(data);
           setIsLoading(false);
       })
       .catch(err => {
           if (err.name === 'AbortError') return;
           setIsLoading(false);
           setActiveCountry(null);
           setGeoData(worldGeoUrl);
       });
       
    return () => controller.abort();
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
           style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 50 }}
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
        projection={activeCountry === 'USA' ? "geoAlbersUsa" : "geoMercator"}
        projectionConfig={{ 
          scale: activeCountry === 'USA' ? 800 : (activeCountry === 'GBR' ? 3200 : 147),
          center: activeCountry === 'GBR' ? [-2, 54.5] : [0, 0]
        }}
        width={800}
        height={500}
        style={{ width: '100%', height: '100%', outline: 'none', opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}
      >
        <ZoomableGroup center={[0, 0]} zoom={1} minZoom={0.5} maxZoom={24}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = getRegionId(geo, numericToA3, activeCountry);
                const placeIdForStore = activeCountry ? `${activeCountry}-${countryId}` : countryId;
                const status = places[placeIdForStore]?.status || 'NONE';
                const isSelected = status !== 'NONE';
                const countryName = geo.properties?.AREANM || geo.properties?.areanm || geo.properties?.name || 'Unknown Region';
                
                const isHighlighted = !!highlightedCountry && (
                  highlightedCountry === (geo.properties?.ISO_A3 || geo.properties?.iso_a3 || geo.properties?.cca3) 
                  || highlightedCountry === countryId
                  || (geo.id && numericToA3[geo.id] && highlightedCountry === numericToA3[geo.id])
                );

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setTooltipContent(`${countryName}${isSelected ? ` - ${status}` : ''}`)}
                    onMouseLeave={() => setTooltipContent('')}
                    onClick={() => handleCountryClick(geo)}
                    onContextMenu={(e) => handleRightClick(e, geo)}
                    fill={getFillColor(status, isHighlighted, !!activeCountry)}
                    stroke={isHighlighted ? "#fbbf24" : 'var(--map-stroke)'}
                    strokeWidth={isHighlighted ? 1.5 : (activeCountry ? 0.7 : 0.5)}
                    style={{
                      default: { fill: getFillColor(status, isHighlighted, !!activeCountry), outline: 'none' },
                      hover: { fill: getFillColor(status, isHighlighted, !!activeCountry), opacity: 0.75, outline: 'none', cursor: 'pointer' },
                      pressed: { fill: 'var(--accent-primary)', outline: 'none' }
                    }}
                  />
                );
              })
            }
          </Geographies>

          {!activeCountry && MICROSTATES.map((marker) => {
            const status = places[marker.id]?.status || 'NONE';
            const isHighlighted = highlightedCountry === marker.id;
            return (
              <Marker 
                key={marker.id} 
                coordinates={marker.coordinates as [number, number]}
                onClick={() => setCountryStatus(marker.id, status === selectionMode ? 'NONE' : selectionMode)}
                onMouseEnter={() => setTooltipContent(`${marker.name}${status !== 'NONE' ? ` - ${status}` : ''}`)}
                onMouseLeave={() => setTooltipContent('')}
              >
                <circle cx={0} cy={0} r={isHighlighted ? 4 : 2.5} fill={getFillColor(status, isHighlighted)} stroke={isHighlighted ? "#fff" : "var(--map-stroke)"} strokeWidth={0.5} style={{ cursor: 'pointer' }} />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {activeCountry === 'GBR' && (
        <div style={{
          position: 'absolute', bottom: '1rem', right: '1rem', width: '380px', height: '280px', zIndex: 40,
          borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column'
        }}>
          <h3 style={{ background: 'var(--map-fill-unselected)', margin: 0, padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
            Crown Dependencies & Overseas Territories
          </h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <ComposableMap projection="geoMercator" style={{ width: '100%', height: '100%', outline: 'none' }} projectionConfig={{ scale: 50 }}>
              <ZoomableGroup center={[0, 0]} zoom={1} minZoom={0.5} maxZoom={8}>
                 <Geographies geography={worldGeoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography key={`geo-inset-${geo.rsmKey}`} geography={geo} fill="var(--map-fill-unselected)" stroke="var(--map-stroke)" strokeWidth={0.5} style={{ default: { outline: 'none' }, hover: { outline: 'none', fill: 'var(--map-fill-hover)' } }} />
                      ))
                    }
                 </Geographies>
                 {UK_TERRITORIES.map((territory) => {
                    const status = places[territory.id]?.status || 'NONE';
                    return (
                      <Marker
                        key={`inset-marker-${territory.id}`} coordinates={territory.coordinates as [number, number]}
                        onClick={() => setCountryStatus(territory.id, status === selectionMode ? 'NONE' : selectionMode)}
                        onMouseEnter={() => setTooltipContent(`${territory.name}${status !== 'NONE' ? ` - ${status}` : ''}`)}
                        onMouseLeave={() => setTooltipContent('')}
                      >
                        <circle cx={0} cy={0} r={status !== 'NONE' ? 6 : 4} fill={getFillColor(status, false, true)} stroke='var(--text-primary)' strokeWidth={status !== 'NONE' ? 1.5 : 1} style={{ cursor: 'pointer' }} />
                        <text textAnchor="middle" y={status !== 'NONE' ? -10 : -8} style={{ fill: 'var(--text-primary)', fontSize: '9px', fontWeight: '600', textShadow: '0 1px 2px var(--bg-dark)' }}>
                          {territory.name === 'British Indian Ocean Territory' ? 'Brit. Indian Ocean' : territory.name}
                        </text>
                      </Marker>
                    );
                  })}
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </div>
      )}
    </>
  );
};

export const StandardMap = memo(StandardMapBase);
