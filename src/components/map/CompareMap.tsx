import React, { memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import type { MapCompareResult } from '../../pages/Compare';

const worldGeoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

// Same MICROSTATES list as StandardMap — shown as markers since they're too small to render as polygons
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
  { id: 'SHN', name: 'Saint Helena', coordinates: [-5.7089, -15.9650] },
];

interface CompareMapProps {
  mergedData: Record<string, MapCompareResult>;
  setTooltipContent: (content: string) => void;
  numericToA3: Record<string, string>;
}

const getCompareColor = (result: MapCompareResult | undefined) => {
  if (!result) return 'var(--map-fill-unselected)';
  switch (result.type) {
    case 'EVERYONE_VISITED': return 'var(--color-both)';
    case 'MOST_VISITED': return 'var(--accent-visited)';
    case 'ONLY_ME_VISITED': return 'var(--color-me-only)';
    case 'THEY_VISITED': return 'var(--color-they-only)';
    case 'EVERYONE_WISHLIST': return 'var(--color-wishlist-both)';
    case 'MIXED_WISHLIST': return 'var(--accent-wishlist)';
    case 'EVERYONE_AVOID': return 'var(--color-avoid)';
    default: return 'var(--map-fill-unselected)';
  }
};

const CompareMapBase: React.FC<CompareMapProps> = ({ mergedData, setTooltipContent, numericToA3 }) => {
  return (
    <ComposableMap
      projectionConfig={{ scale: 147 }}
      width={800}
      height={400}
      style={{ width: '100%', height: '100%', outline: 'none' }}
    >
      <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={8}>
        <Geographies geography={worldGeoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const rawId = geo.properties?.ISO_A3 || geo.id;
              const countryId = numericToA3[rawId] || rawId;
              const result = mergedData[countryId];
              const countryName = geo.properties.name || 'Unknown Region';

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => {
                    const label = result ? `${countryName} - ${result.label} (${result.count}/${result.totalUsers})` : countryName;
                    setTooltipContent(label);
                  }}
                  onMouseLeave={() => setTooltipContent('')}
                  fill={getCompareColor(result)}
                  stroke="var(--map-stroke)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none', transition: 'all 0.2s ease', fill: getCompareColor(result), opacity: 1 },
                    hover: { fill: result && result.type !== 'NONE' ? getCompareColor(result) : 'var(--map-fill-hover)', opacity: 0.85, outline: 'none', cursor: 'pointer', transition: 'all 0.2s ease' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* Microstate markers — identical placement to StandardMap */}
        {MICROSTATES.map((marker) => {
          const result = mergedData[marker.id];
          const color = getCompareColor(result);
          const hasResult = !!result;

          return (
            <Marker
              key={marker.id}
              coordinates={marker.coordinates as [number, number]}
              onMouseEnter={() => {
                const label = result ? `${marker.name} - ${result.label} (${result.count}/${result.totalUsers})` : marker.name;
                setTooltipContent(label);
              }}
              onMouseLeave={() => setTooltipContent('')}
            >
              <circle
                cx={0}
                cy={0}
                r={hasResult ? 4 : 2.5}
                fill={color}
                stroke="var(--map-stroke)"
                strokeWidth={0.5}
                style={{ cursor: 'default', transition: 'all 0.2s ease' }}
              />
            </Marker>
          );
        })}
      </ZoomableGroup>
    </ComposableMap>
  );
};

export const CompareMap = memo(CompareMapBase);
