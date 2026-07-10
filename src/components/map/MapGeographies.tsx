import React, { memo } from 'react';
import { Geographies, Geography } from 'react-simple-maps';
import { getFillColor, getRegionId, showMapTooltip, hideMapTooltip, formatStatusLabel } from '../../utils/mapUtils';
import type { GeoFeature, GeoProperties } from '../../utils/mapUtils';
import { getCleanGbrName } from '../../data/gbrRegionData';
import type { PlaceStatus } from '../../store/useStore';

interface MapGeographiesProps {
  geoData: string | object;
  activeCountry: string | null;
  highlightedCountry: string | null;
  numericToA3: Record<string, string>;
  places: Record<string, { status: PlaceStatus }>;
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  showRevisit: boolean;
  handleCountryClick: (countryId: string, event: React.MouseEvent, displayName?: string) => void;
  strokeWidth?: number;
}

interface RsmGeography {
  id: string | number;
  properties?: GeoProperties;
  rsmKey: string;
}

// Static styling object to prevent recreation and deep-diffing overhead in react-simple-maps
const GEOGRAPHY_STYLE = {
  default: { outline: 'none' },
  hover: { outline: 'none' },
  pressed: { outline: 'none' }
};

const MapGeographiesBase: React.FC<MapGeographiesProps> = ({
  geoData,
  activeCountry,
  highlightedCountry,
  numericToA3,
  places,
  showVisited,
  showWishlist,
  showAvoid,
  showRevisit,
  handleCountryClick,
  strokeWidth
}) => {
  return (
    <Geographies key={activeCountry || 'world'} geography={geoData}>
      {({ geographies }) => {
        // Pre-compute duplicates for Natural Earth admin-1 features of the active country
        const duplicateIsos = new Set<string>();
        const duplicateNames = new Set<string>();
        
        if (activeCountry) {
          const isoCounts: Record<string, number> = {};
          const nameCounts: Record<string, number> = {};
          
          geographies.forEach(g => {
            const iso = g.properties?.iso_3166_2 || '';
            const name = g.properties?.name || '';
            if (iso) isoCounts[iso] = (isoCounts[iso] || 0) + 1;
            if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
          });
          
          for (const [iso, count] of Object.entries(isoCounts)) {
            if (count > 1) duplicateIsos.add(iso);
          }
          for (const [name, count] of Object.entries(nameCounts)) {
            if (count > 1) duplicateNames.add(name);
          }
        }

        return (geographies as RsmGeography[]).map((geo) => {
          const feature: GeoFeature = {
            id: geo.id,
            properties: geo.properties
          };
          const countryId = getRegionId(feature, numericToA3, activeCountry, duplicateIsos, duplicateNames);
          // For drill-downs, the ID may already be prefixed from getRegionId
          const placeIdForStore = countryId;
             
          const status = placeIdForStore ? (places[placeIdForStore]?.status || 'NONE') : 'NONE';
          const isSelected = status !== 'NONE';
          // Get display name from various property formats
          let countryName = (
            geo.properties?.AREANM || 
            geo.properties?.areanm || 
            geo.properties?.name || 
            'Unknown Region'
          ) as string;
          if (countryName === 'Commonwealth of the Northern Mariana Islands') {
            countryName = 'Northern Mariana Islands';
          }
          if (activeCountry === 'GBR') {
            countryName = getCleanGbrName(countryName);
          }
          if (activeCountry === 'SGP') {
            countryName = countryName.toLowerCase().replace(/(?:^|\s|-)\S/g, (match) => match.toUpperCase());
          }

          const iso = geo.properties?.iso_3166_2 || '';
          const typeEn = geo.properties?.type_en || '';
          if (activeCountry) {
            const hasIsoDuplicate = iso && duplicateIsos.has(iso);
            const hasNameDuplicate = countryName && duplicateNames.has(countryName);
            if ((hasIsoDuplicate || hasNameDuplicate) && typeEn) {
              countryName = `${countryName} (${typeEn})`;
            }
          }
          
          const isHighlighted = !!highlightedCountry && (
            highlightedCountry === (geo.properties?.ISO_A3 || geo.properties?.iso_a3 || geo.properties?.cca3) 
            || highlightedCountry === countryId
            || !!(geo.id && numericToA3[geo.id] && highlightedCountry === numericToA3[geo.id])
          );

          const fill = getFillColor(status, isHighlighted, !!activeCountry, showVisited, showWishlist, showAvoid, showRevisit);

          // Build tooltip text
          const tooltipParts = [countryName];
          if (isSelected) tooltipParts.push(`— ${formatStatusLabel(status)}`);
          const tooltipText = tooltipParts.join(' ');

          return (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              onMouseEnter={(e) => showMapTooltip(tooltipText, e)}
              onMouseMove={(e) => showMapTooltip(tooltipText, e)}
              onMouseLeave={hideMapTooltip}
              onClick={(e) => handleCountryClick(countryId, e, countryName)}
              fill={fill}
              stroke={isHighlighted ? "var(--accent-highlight)" : 'var(--map-stroke)'}
              strokeWidth={isHighlighted ? (strokeWidth ? strokeWidth * 2 : 1.5) : (strokeWidth ?? (activeCountry ? 0.7 : 0.5))}
              style={GEOGRAPHY_STYLE}
            />
          );
        });
      }}
    </Geographies>
  );
};

export const MapGeographies = memo(MapGeographiesBase);
