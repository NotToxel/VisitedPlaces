import React from 'react';
import { Geographies, Geography } from 'react-simple-maps';
import { getFillColor, getRegionId } from '../../utils/mapUtils';
import type { PlaceStatus } from '../../store/useStore';

interface MapGeographiesProps {
  geoData: string | object;
  activeCountry: string | null;
  highlightedCountry: string | null;
  numericToA3: Record<string, string>;
  places: Record<string, { status: PlaceStatus }>;
  selectionMode: 'VISITED' | 'WISHLIST' | 'AVOID';
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  setTooltipContent: (content: string) => void;
  handleCountryClick: (geo: any) => void;
  handleRightClick: (e: React.MouseEvent, geo: any) => void;
}

export const MapGeographies: React.FC<MapGeographiesProps> = ({
  geoData,
  activeCountry,
  highlightedCountry,
  numericToA3,
  places,
  showVisited,
  showWishlist,
  showAvoid,
  setTooltipContent,
  handleCountryClick,
  handleRightClick
}) => {
  return (
    <Geographies geography={geoData}>
      {({ geographies }) =>
        geographies.map((geo) => {
          const countryId = getRegionId(geo, numericToA3, activeCountry);
          // Standardize ID format for the datastore (e.g. USA-72)
          const placeIdForStore = (activeCountry && countryId && !countryId.toString().startsWith(`${activeCountry}-`)) 
             ? `${activeCountry}-${countryId}` 
             : countryId;
             
          const status = placeIdForStore ? (places[placeIdForStore]?.status || 'NONE') : 'NONE';
          const isSelected = status !== 'NONE';
          const countryName = geo.properties?.AREANM || geo.properties?.areanm || geo.properties?.name || 'Unknown Region';
          
          const isHighlighted = !!highlightedCountry && (
            highlightedCountry === (geo.properties?.ISO_A3 || geo.properties?.iso_a3 || geo.properties?.cca3) 
            || highlightedCountry === countryId
            || (geo.id && numericToA3[geo.id] && highlightedCountry === numericToA3[geo.id])
          );

          const fill = getFillColor(status, isHighlighted, !!activeCountry, showVisited, showWishlist, showAvoid);
          
          return (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              onMouseEnter={() => setTooltipContent(`${countryName}${isSelected ? ` - ${status}` : ''}`)}
              onMouseLeave={() => setTooltipContent('')}
              onClick={() => handleCountryClick(geo)}
              onContextMenu={(e) => handleRightClick(e, geo)}
              fill={fill}
              stroke={isHighlighted ? "var(--accent-highlight)" : 'var(--map-stroke)'}
              strokeWidth={isHighlighted ? 1.5 : (activeCountry ? 0.7 : 0.5)}
              style={{
                default: { fill, outline: 'none' },
                hover: { fill, opacity: 0.75, outline: 'none', cursor: 'pointer' },
                pressed: { fill: 'var(--accent-primary)', outline: 'none' }
              }}
            />
          );
        })
      }
    </Geographies>
  );
};
