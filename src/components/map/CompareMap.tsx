import React, { memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import type { MapCompareResult } from '../../pages/Compare'; // We will define this type in Compare.tsx

const geoUrl = '/src/assets/features.json';

interface CompareMapProps {
  mergedData: Record<string, MapCompareResult>;
  setTooltipContent: (content: string) => void;
}

const getCompareColor = (result: MapCompareResult | undefined) => {
  if (!result) return 'rgba(255, 255, 255, 0.05)';
  
  // Use distinct colors based on the comparison status
  switch (result.type) {
    case 'EVERYONE_VISITED': return 'var(--color-both)'; // e.g., bright blue/green
    case 'MOST_VISITED': return 'var(--accent-visited)';
    case 'ONLY_ME_VISITED': return 'var(--color-me-only)';
    case 'THEY_VISITED': return 'var(--color-they-only)';
    case 'EVERYONE_WISHLIST': return 'var(--color-wishlist-both)';
    case 'MIXED_WISHLIST': return 'var(--accent-wishlist)';
    default: return 'rgba(255, 255, 255, 0.05)';
  }
};

const CompareMapBase: React.FC<CompareMapProps> = ({ mergedData, setTooltipContent }) => {
  return (
    <ComposableMap
      projectionConfig={{ scale: 147 }}
      width={800}
      height={400}
      style={{ width: '100%', height: '100%', outline: 'none' }}
    >
      <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={8}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryId = geo.id || geo.properties.ISO_A3;
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
                  stroke="var(--bg-dark)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none', transition: 'fill 0.2s ease' },
                    hover: { fill: result ? getCompareColor(result) : 'rgba(255,255,255,0.2)', outline: 'none', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  );
};

export const CompareMap = memo(CompareMapBase);
