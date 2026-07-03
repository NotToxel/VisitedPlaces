import React, { useState, useCallback } from 'react';
import { NUMERIC_TO_A3 } from '../../data/countries';
import { StandardMap } from './StandardMap';
import { HexagonMap } from './HexagonMap';
import { CountryContextMenu } from './CountryContextMenu';
import { MapFilterBar } from './MapFilterBar';
import { MapSearchBar } from './MapSearchBar';
import { useStore } from '../../store/useStore';
import { drilldownRegistry } from '../../config/drilldownConfig';
import type { PlaceStatus } from '../../store/useStore';
import { ArrowLeft } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';
import { getSubRegionUrl } from '../../utils/topojsonCache';
import { TerritoryListPanel } from './TerritoryListPanel';

interface ContextMenuState {
  countryId: string;
  displayName?: string;
  x: number;
  y: number;
}

export const MapContainer: React.FC = () => {
  const { places, setCountryStatus } = useStore();
  const [mapStyle, setMapStyle] = useState<'STANDARD' | 'HEXAGON'>('STANDARD');
  const [showHexLabels, setShowHexLabels] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  // Visibility filters
  const [showVisited, setShowVisited] = useState(true);
  const [showWishlist, setShowWishlist] = useState(true);
  const [showAvoid, setShowAvoid] = useState(true);
  const [showRevisit, setShowRevisit] = useState(true);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Search highlight
  const [highlightedCountryA3, setHighlightedCountryA3] = useState<string | null>(null);

  const currentConfig = activeCountry ? drilldownRegistry[activeCountry] : null;
  const activeCountryData = COUNTRIES.find((c) => c.id === activeCountry);

  // Country click → show context menu
  const handleCountryClick = useCallback(
    (countryId: string, event: React.MouseEvent, displayName?: string) => {
      event?.stopPropagation?.();
      if (activeCountry) {
        // In drilldown view, prefix with parent country code
        const placeIdForStore =
          countryId && !countryId.startsWith(`${activeCountry}-`)
            ? `${activeCountry}-${countryId}`
            : countryId;
        setContextMenu({
          countryId: placeIdForStore,
          displayName,
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        setContextMenu({
          countryId,
          displayName,
          x: event.clientX,
          y: event.clientY,
        });
      }
    },
    [activeCountry]
  );

  // Status change from context menu
  const handleSetStatus = useCallback(
    (countryId: string, status: PlaceStatus) => {
      setCountryStatus(countryId, status);
    },
    [setCountryStatus]
  );

  // Drill-down trigger
  const handleDrillDown = useCallback(
    (countryId: string) => {
      if (getSubRegionUrl(countryId)) {
        setActiveCountry(countryId);
      }
    },
    []
  );



  // Search handlers
  const handleCountrySelect = useCallback((countryId: string) => {
    setHighlightedCountryA3(countryId);
  }, []);

  const handleSearchClear = useCallback(() => {
    setHighlightedCountryA3(null);
  }, []);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', background: 'transparent', userSelect: 'none' }}>
      {/* Floating Search Bar (hidden in drilldown) */}
      {!activeCountry && (
        <MapSearchBar
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          showHexLabels={showHexLabels}
          setShowHexLabels={setShowHexLabels}
          onCountrySelect={handleCountrySelect}
          onSearchClear={handleSearchClear}
        />
      )}

      {/* Drilldown back button + country info */}
      {activeCountry && activeCountryData && (
        <div className="map-drilldown-header">
          <button
            onClick={() => setActiveCountry(null)}
            className="map-drilldown-header__back"
          >
            <ArrowLeft size={14} />
            <span>Back to World</span>
          </button>
          <div className="map-drilldown-header__info">
            {activeCountryData.flag ? (
              <img
                key={activeCountryData.flag}
                src={activeCountryData.flag}
                alt=""
                className="map-drilldown-header__flag"
              />
            ) : (
              <div className="map-drilldown-header__flag-placeholder" />
            )}
            <span className="map-drilldown-header__name">{activeCountryData.name}</span>
          </div>
        </div>
      )}

      {/* Territory list panel (for drilldown countries with territories) */}
      {activeCountry && currentConfig?.territories && currentConfig.territories.length > 0 && (
        <TerritoryListPanel
          activeCountry={activeCountry}
          territories={currentConfig.territories}
          territoryLabel={currentConfig.territoryLabel}
          places={places}
          onSetStatus={handleSetStatus}
        />
      )}

      {/* Map Viewport */}
      <div style={{ height: '100%', width: '100%' }}>
        {mapStyle === 'STANDARD' ? (
          <StandardMap
            activeCountry={activeCountry}
            setActiveCountry={setActiveCountry}
            highlightedCountry={highlightedCountryA3}
            numericToA3={NUMERIC_TO_A3}
            showVisited={showVisited}
            showWishlist={showWishlist}
            showAvoid={showAvoid}
            showRevisit={showRevisit}
            onCountryClick={handleCountryClick}
          />
        ) : (
          <HexagonMap
            highlightedCountry={highlightedCountryA3}
            showLabels={showHexLabels}
            showVisited={showVisited}
            showWishlist={showWishlist}
            showAvoid={showAvoid}
            showRevisit={showRevisit}
            onCountryClick={handleCountryClick}
          />
        )}
      </div>

      {/* Floating Filter Bar */}
      <MapFilterBar
        showVisited={showVisited}
        showWishlist={showWishlist}
        showAvoid={showAvoid}
        showRevisit={showRevisit}
        setShowVisited={setShowVisited}
        setShowWishlist={setShowWishlist}
        setShowAvoid={setShowAvoid}
        setShowRevisit={setShowRevisit}
      />

      {/* Country Context Menu */}
      {contextMenu && (
        <CountryContextMenu
          countryId={contextMenu.countryId}
          displayName={contextMenu.displayName}
          currentStatus={places[contextMenu.countryId]?.status || 'NONE'}
          x={contextMenu.x}
          y={contextMenu.y}
          onSetStatus={handleSetStatus}
          onDrillDown={handleDrillDown}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
