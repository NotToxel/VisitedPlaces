import React, { memo, useState } from 'react';
import { ComposableMap, ZoomableGroup } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { hexGridData } from '../../utils/hexGridData';

interface HexagonMapProps {
  setTooltipContent: (content: string) => void;
  selectionMode: 'VISITED' | 'WISHLIST' | 'AVOID';
  highlightedCountry?: string | null;
  showLabels?: boolean;
}

const RADIUS = 11; // Hexagon circumradius
const HEX_WIDTH = Math.sqrt(3) * RADIUS;
const X_SPACING = HEX_WIDTH;
const Y_SPACING = RADIUS * 1.5;

const generateHexagonPath = (r: number) => {
  const angles = [0, 60, 120, 180, 240, 300];
  const points = angles.map(angle => {
    const rad = (angle - 30) * (Math.PI / 180);
    return `${r * Math.cos(rad)},${r * Math.sin(rad)}`;
  });
  return `M${points.join('L')}Z`;
};

const HEX_PATH = generateHexagonPath(RADIUS);

const getFillColor = (status: PlaceStatus, isHovered: boolean, isHighlighted: boolean) => {
  if (isHighlighted) return '#fbbf24'; 
  if (status === 'VISITED') return 'var(--accent-visited)';
  if (status === 'WISHLIST') return 'var(--accent-wishlist)';
  if (status === 'AVOID') return '#ef4444';
  return isHovered ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
};

const HexGrid = ({ setTooltipContent, selectionMode, places, setCountryStatus, highlightedCountry, showLabels }: any) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleCountryClick = (countryId: string) => {
    if (!countryId) return;
    const currentStatus = places[countryId]?.status || 'NONE';
    if (currentStatus === selectionMode) {
      setCountryStatus(countryId, 'NONE');
    } else {
      setCountryStatus(countryId, selectionMode);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setTooltipContent(`Sub-regions are only visible in Standard Map view. Switch to Standard Map to drill down.`);
    setTimeout(() => setTooltipContent(''), 3000);
  };

  return (
    <g transform="translate(120, 20)">
      {Object.entries(hexGridData).map(([countryId, dot]) => {
        const placeIdForStore = countryId;
        const status = places[placeIdForStore]?.status || 'NONE';
        const isHovered = hoveredId === countryId;
        const isHighlighted = highlightedCountry === countryId;
        
        const isSelected = status !== 'NONE';

        const cx = dot.x * X_SPACING + (dot.y % 2 === 1 ? X_SPACING / 2 : 0);
        const cy = dot.y * Y_SPACING;

        return (
          <g key={countryId}>
            <path
              d={HEX_PATH}
              transform={`translate(${cx}, ${cy}) ${isSelected || isHighlighted ? 'scale(1.15)' : 'scale(1)'}`}
              fill={getFillColor(status, isHovered, isHighlighted)}
              stroke="#1a1a1a"
              strokeWidth={1}
              style={{
                cursor: 'pointer',
                outline: 'none',
                transition: 'fill 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={() => {
                setHoveredId(countryId);
                setTooltipContent(`${dot.name}${isSelected ? ` - ${status}` : ''}`);
              }}
              onMouseLeave={() => {
                setHoveredId(null);
                setTooltipContent('');
              }}
              onClick={() => handleCountryClick(countryId)}
              onContextMenu={(e) => handleRightClick(e)}
            />
            {showLabels && (
              <text 
                x={cx} y={cy} 
                textAnchor="middle" 
                dy=".35em" 
                fontSize="4.5" 
                fill="rgba(0,0,0,0.6)" 
                style={{ pointerEvents: 'none', fontWeight: 600 }}
              >
                {countryId}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

const HexagonMapBase: React.FC<HexagonMapProps> = ({ setTooltipContent, selectionMode, highlightedCountry, showLabels }) => {
  const { places, setCountryStatus } = useStore();

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 147 }}
      width={800}
      height={400}
      style={{ width: '100%', height: '100%', outline: 'none' }}
    >
      <ZoomableGroup center={[0, 0]} zoom={0.8} minZoom={0.5} maxZoom={8}>
         <HexGrid 
           setTooltipContent={setTooltipContent} 
           selectionMode={selectionMode} 
           places={places} 
           setCountryStatus={setCountryStatus} 
           highlightedCountry={highlightedCountry}
           showLabels={showLabels}
         />
      </ZoomableGroup>
    </ComposableMap>
  );
};

export const HexagonMap = memo(HexagonMapBase);

