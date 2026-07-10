import React, { memo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import type { MapCompareResult } from '../../pages/Compare';
import { MICROSTATES } from '../../data/mapData';
import { WORLD_GEO_URL } from '../../config/urls';
import { fetchRawTopology } from '../../utils/topojsonCache';
import { showMapTooltip, hideMapTooltip } from '../../utils/mapUtils';

interface CompareMapProps {
  mergedData: Record<string, MapCompareResult>;
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

// Static styling configuration to bypass react-simple-maps deep styles comparisons
const GEOGRAPHY_STYLE = {
  default: { outline: 'none' },
  hover: { outline: 'none' },
  pressed: { outline: 'none' }
};

const COMPOSABLE_MAP_STYLE = { width: '100%', height: '100%', outline: 'none' };

interface CompareMapGeographiesProps {
  worldData: string | object;
  mergedData: Record<string, MapCompareResult>;
  numericToA3: Record<string, string>;
}

// Memoized Geographies component to prevent re-rendering paths during tooltip status updates
const CompareMapGeographiesBase: React.FC<CompareMapGeographiesProps> = ({
  worldData,
  mergedData,
  numericToA3
}) => {
  return (
    <Geographies geography={worldData}>
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
              onMouseEnter={(e) => {
                const label = result ? `${countryName} - ${result.label} (${result.count}/${result.totalUsers})` : countryName;
                showMapTooltip(label, e);
              }}
              onMouseMove={(e) => {
                const label = result ? `${countryName} - ${result.label} (${result.count}/${result.totalUsers})` : countryName;
                showMapTooltip(label, e);
              }}
              onMouseLeave={hideMapTooltip}
              fill={getCompareColor(result)}
              stroke="var(--map-stroke)"
              strokeWidth={0.5}
              style={GEOGRAPHY_STYLE}
            />
          );
        })
      }
    </Geographies>
  );
};

const CompareMapGeographies = memo(CompareMapGeographiesBase);

const CompareMapBase: React.FC<CompareMapProps> = ({ mergedData, numericToA3 }) => {
  const [worldData, setWorldData] = useState<object | string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchRawTopology(WORLD_GEO_URL)
      .then(data => {
        if (active && data) {
          setWorldData(data as object);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 147, center: [0, 0] }}
        width={800}
        height={500}
        style={COMPOSABLE_MAP_STYLE}
      >
        <ZoomableGroup 
          center={[0, 0]} 
          zoom={1} 
          minZoom={0.5} 
          maxZoom={24}
          translateExtent={[[-200, -150], [1000, 650]]}
        >
          {worldData && (
            <CompareMapGeographies 
              worldData={worldData}
              mergedData={mergedData}
              numericToA3={numericToA3}
            />
          )}

          {/* Microstate markers — identical placement to StandardMap */}
          {!isLoading && MICROSTATES.map((marker) => {
            const result = mergedData[marker.id];
            const color = getCompareColor(result);
            const hasResult = !!result;

            return (
              <CompareMicrostateMarker
                key={marker.id}
                marker={marker}
                result={result}
                color={color}
                hasResult={hasResult}
              />
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {isLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
          <span>Loading Map Data...</span>
        </div>
      )}
    </div>
  );
};

interface CompareMicrostateMarkerProps {
  marker: typeof MICROSTATES[number];
  result: MapCompareResult | undefined;
  color: string;
  hasResult: boolean;
}

const CompareMicrostateMarkerBase: React.FC<CompareMicrostateMarkerProps> = ({
  marker,
  result,
  color,
  hasResult
}) => {
  const label = result ? `${marker.name} - ${result.label} (${result.count}/${result.totalUsers})` : marker.name;
  return (
    <Marker coordinates={marker.coordinates as [number, number]}>
      <circle
        cx={0}
        cy={0}
        r={hasResult ? 4 : 2.5}
        fill={color}
        stroke="var(--map-stroke)"
        strokeWidth={0.5}
        style={{ cursor: 'default', transition: 'all 0.2s ease' }}
        onMouseEnter={(e) => showMapTooltip(label, e)}
        onMouseMove={(e) => showMapTooltip(label, e)}
        onMouseLeave={hideMapTooltip}
      />
    </Marker>
  );
};

const CompareMicrostateMarker = memo(CompareMicrostateMarkerBase);

export const CompareMap = memo(CompareMapBase);
