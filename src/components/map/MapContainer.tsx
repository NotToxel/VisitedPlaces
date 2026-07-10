import React, { useState, useCallback, useEffect } from 'react';
import { NUMERIC_TO_A3 } from '../../data/countries';
import { StandardMap } from './StandardMap';
import { HexagonMap } from './HexagonMap';
import { RegionCardGrid } from './RegionCardGrid';
import { CountryContextMenu } from './CountryContextMenu';
import { MapFilterBar } from './MapFilterBar';
import { MapSearchBar } from './MapSearchBar';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { ArrowLeft, Zap, X, Check, Heart, RotateCcw, Ban } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';
import { getTerritoriesForCountry, getTerritoryLabel, getAllTerritories } from '../../data/territoriesRegistry';
import { TerritoryListPanel } from './TerritoryListPanel';
import { getAllCountryFeaturesWithMeta } from '../../data/naturalEarthAdmin1';
import type { NERegionFeature } from '../../data/naturalEarthAdmin1';
import { getSubRegionUrl, fetchSubRegions } from '../../utils/topojsonCache';
import type { TopoRegion } from '../../utils/topojsonCache';
import { getPlaceFlagUrl, preloadPlaceFlags } from '../../utils/flagUtils';
import { hideMapTooltip } from '../../utils/mapUtils';

interface ContextMenuState {
  countryId: string;
  displayName?: string;
  x: number;
  y: number;
}

const CARD_GRID_COUNTRIES = new Set([
  'FJI', 'KIR', 'MDV', 'SYC', 'FSM', 'MHL', 'PLW', 'CPV', 'COM', 'STP',
  'ATF', 'PYF', 'COK', 'SHN', 'WLF', 'TON'
]);

export const MapContainer: React.FC = () => {
  const { places, setCountryStatus, setRegionStatus, neDataLoaded } = useStore();
  if (neDataLoaded) { /* Trigger re-render on load */ }
  const [mapStyle, setMapStyle] = useState<'STANDARD' | 'HEXAGON'>('STANDARD');
  const [showHexLabels, setShowHexLabels] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [expressMode, setExpressMode] = useState<boolean>(false);
  const [expressStatus, setExpressStatus] = useState<PlaceStatus>('VISITED');
  const [subRegions, setSubRegions] = useState<TopoRegion[]>([]);

  useEffect(() => {
    if (activeCountry) {
      fetchSubRegions(activeCountry)
        .then((regions) => {
          setSubRegions(regions);
          preloadPlaceFlags(regions.map((r) => r.id));
        })
        .catch(() => {
          Promise.resolve().then(() => setSubRegions([]));
        });
    } else {
      Promise.resolve().then(() => setSubRegions([]));
    }
  }, [activeCountry]);

  // Visibility filters
  const [showVisited, setShowVisited] = useState(true);
  const [showWishlist, setShowWishlist] = useState(true);
  const [showAvoid, setShowAvoid] = useState(true);
  const [showRevisit, setShowRevisit] = useState(true);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Search highlight
  const [highlightedCountryA3, setHighlightedCountryA3] = useState<string | null>(null);

  // Card grid state for archipelago nations
  const [cardGridFeatures, setCardGridFeatures] = useState<NERegionFeature[]>([]);
  const [cardGridCountry, setCardGridCountry] = useState<string | null>(null);

  // Derived: card grid mode is active when features are loaded for the current country
  const cardGridMode = activeCountry !== null && cardGridCountry === activeCountry && cardGridFeatures.length > 0;

  // Detect card grid mode when activeCountry changes
  useEffect(() => {
    if (!activeCountry || getSubRegionUrl(activeCountry)) {
      // No active country or curated drill-down — no async work needed.
      // State will be stale but cardGridMode derivation handles it (activeCountry !== cardGridCountry).
      return;
    }

    let active = true;

    // Check if the country is explicitly listed as a card-grid island nation/territory
    if (CARD_GRID_COUNTRIES.has(activeCountry)) {
      getAllCountryFeaturesWithMeta(activeCountry).then((features) => {
        if (!active) return;
        setCardGridFeatures(features);
        setCardGridCountry(activeCountry);
      });
    }

    return () => { active = false; };
  }, [activeCountry]);

  // Dynamically resolve country/territory name and flag (fixes New Caledonia getting stuck)
  const activeCountryName = activeCountry ? (() => {
    const country = COUNTRIES.find((c) => c.id === activeCountry);
    if (country) return country.name;
    const territory = getAllTerritories().find((t) => t.id === activeCountry || t.id.endsWith(activeCountry));
    if (territory) return territory.name;

    const WELL_KNOWN_NAMES: Record<string, string> = {
      'ATF': 'French Southern and Antarctic Lands',
      'NCL': 'New Caledonia',
      'GRL': 'Greenland',
      'ESH': 'Western Sahara',
      'FRO': 'Faroe Islands',
      'FLK': 'Falkland Islands',
      'SJM': 'Svalbard and Jan Mayen',
      'ALA': 'Åland Islands',
      'PYF': 'French Polynesia',
      'COK': 'Cook Islands',
      'SHN': 'Saint Helena',
      'WLF': 'Wallis and Futuna'
    };
    if (WELL_KNOWN_NAMES[activeCountry]) {
      return WELL_KNOWN_NAMES[activeCountry];
    }
    return activeCountry;
  })() : '';

  const activeCountryFlag = activeCountry ? getPlaceFlagUrl(activeCountry) : null;

  const territories = activeCountry ? getTerritoriesForCountry(activeCountry) : [];
  const territoryLabel = activeCountry ? getTerritoryLabel(activeCountry) : '';

  // Country click → toggle status in express mode or show context menu
  const handleCountryClick = useCallback(
    (countryId: string, event: React.MouseEvent, displayName?: string) => {
      event?.stopPropagation?.();
      hideMapTooltip(); // Hide tooltip immediately when clicked/tapped (especially on mobile!)
      
      if (expressMode) {
        if (countryId.includes('-')) {
          const parentCode = countryId.split('-')[0];
          const currentStatus = places[countryId]?.status || 'NONE';
          const nextStatus = currentStatus === expressStatus ? 'NONE' : expressStatus;
          setRegionStatus(parentCode, countryId, nextStatus);
        } else {
          const currentStatus = places[countryId]?.status || 'NONE';
          const nextStatus = currentStatus === expressStatus ? 'NONE' : expressStatus;
          setCountryStatus(countryId, nextStatus);
        }
        return;
      }

      setContextMenu({
        countryId,
        displayName,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [expressMode, expressStatus, places, setCountryStatus, setRegionStatus]
  );

  // Status change from context menu
  const handleSetStatus = useCallback(
    (countryId: string, status: PlaceStatus) => {
      setCountryStatus(countryId, status);
    },
    [setCountryStatus]
  );

  // Region status change from card grid
  const handleSetRegionStatus = useCallback(
    (countryId: string, regionId: string, status: PlaceStatus) => {
      setRegionStatus(countryId, regionId, status);
    },
    [setRegionStatus]
  );

  // Drill-down trigger — now works for all countries
  const handleDrillDown = useCallback(
    (countryId: string) => {
      setActiveCountry(countryId);
      setMapStyle('STANDARD');
    },
    [setMapStyle]
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
      {/* Floating Search Bar */}
      <MapSearchBar
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        showHexLabels={showHexLabels}
        setShowHexLabels={setShowHexLabels}
        onCountrySelect={handleCountrySelect}
        onSearchClear={handleSearchClear}
        expressMode={expressMode}
        setExpressMode={setExpressMode}
        expressStatus={expressStatus}
        activeCountry={activeCountry}
        subRegions={subRegions}
        className={activeCountry ? "map-search-bar--drilldown" : ""}
      />

      {/* Express Mode Active Banner */}
      {expressMode && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 bg-slate-900/85 backdrop-blur-md text-white font-extrabold px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl shadow-lg text-[11px] select-none border border-white/10 transition-all ${
          activeCountry ? 'top-[98px] sm:top-[88px]' : 'top-[88px]'
        }`}>
          <Zap size={12} fill="currentColor" className="animate-pulse text-amber-400 shrink-0" />
          <span className="text-amber-400 whitespace-nowrap">Express</span>
          <div className="w-px h-4 bg-white/15 shrink-0" />
          {/* Status selector pills */}
          {([['VISITED', 'Visited', 'var(--accent-visited)'], ['WISHLIST', 'Wishlist', 'var(--accent-wishlist)'], ['REVISIT', 'Revisit', 'var(--accent-revisit)'], ['AVOID', 'Avoid', 'var(--accent-avoid)']] as [PlaceStatus, string, string][]).map(([status, label, color]) => (
            <button
              key={status}
              onClick={() => setExpressStatus(status)}
              className="flex items-center justify-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border"
              title={label}
              style={{
                background: expressStatus === status ? color : 'transparent',
                color: expressStatus === status ? '#0f172a' : color,
                borderColor: expressStatus === status ? 'transparent' : `color-mix(in srgb, ${color} 30%, transparent)`,
                opacity: expressStatus === status ? 1 : 0.7,
              }}
            >
              {status === 'VISITED' && <Check size={10} />}
              {status === 'WISHLIST' && <Heart size={10} fill={expressStatus === status ? 'currentColor' : 'none'} />}
              {status === 'REVISIT' && <RotateCcw size={10} />}
              {status === 'AVOID' && <Ban size={10} />}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <div className="w-px h-4 bg-white/15 shrink-0" />
          <button 
            onClick={() => setExpressMode(false)}
            className="hover:bg-white/10 p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer text-white/50 hover:text-white"
            title="Disable Express Mode"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Drilldown back button + country info */}
      {activeCountry && (
        <div className="map-drilldown-header">
          <button
            onClick={() => setActiveCountry(null)}
            className="map-drilldown-header__back"
          >
            <ArrowLeft size={14} />
            <span>Back to World</span>
          </button>
          <div className="map-drilldown-header__info">
            {activeCountryFlag ? (
              <img
                key={activeCountryFlag}
                src={activeCountryFlag}
                alt=""
                className="map-drilldown-header__flag"
              />
            ) : (
              <div className="map-drilldown-header__flag-placeholder" />
            )}
            <span className="map-drilldown-header__name">{activeCountryName}</span>
          </div>
        </div>
      )}

      {/* Territory list panel (for any country with territories) */}
      {activeCountry && territories.length > 0 && (
        <TerritoryListPanel
          activeCountry={activeCountry}
          territories={territories}
          territoryLabel={territoryLabel}
          places={places}
          onSetStatus={handleSetStatus}
          highlightedTerritoryId={highlightedCountryA3}
        />
      )}

      {/* Map Viewport or Card Grid */}
      <div style={{ height: '100%', width: '100%' }}>
        {cardGridMode && activeCountry ? (
          <RegionCardGrid
            activeCountry={activeCountry}
            features={cardGridFeatures}
            places={places}
            onSetRegionStatus={handleSetRegionStatus}
          />
        ) : mapStyle === 'STANDARD' ? (
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
        activeCountry={activeCountry}
        subRegions={subRegions}
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
