import React, { memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import type { MapCompareResult } from '../../pages/Compare';
import { MICROSTATES } from '../../data/mapData';

const worldGeoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';



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
    case 'EVERYONE_REVISIT': return 'var(--color-revisit-both)';
    case 'MIXED_REVISIT': return 'var(--color-revisit-mixed)';
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
