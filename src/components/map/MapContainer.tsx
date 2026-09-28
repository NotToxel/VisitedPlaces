import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { hideMapTooltip } from '../../utils/mapUtils';
import { preloadPlaceFlags } from '../../utils/flagUtils';
import { FlagImage } from '../common/FlagImage';
import { isMultiRegionLocality } from '../../utils/placeSearch';
import type { SearchResult } from '../../utils/placeSearch';
import { resolvePlaceRegion } from '../../utils/resolvePlaceRegion';

interface SelectedRegion {
  sourceId: string;
  countryId: string;
  regionId?: string;
  placeName?: string;
  coordinates?: [number, number];
  areaName?: string;
  resolutionFailed?: boolean;
  requiresAreaChoice?: boolean;
}

interface ContextMenuState {
  countryId: string;
  displayName?: string;
  x: number;
  y: number;
}

const CARD_GRID_COUNTRIES = new Set([
  'FJI', 'KIR', 'MDV', 'SYC', 'FSM', 'MHL', 'PLW', 'CPV', 'COM',
  'ATF', 'PYF', 'COK', 'SHN', 'WLF', 'TON'
]);

export const MapContainer: React.FC = () => {
  const { places, setCountryStatus, setRegionStatus } = useStore();
  const [mapStyle, setMapStyle] = useState<'STANDARD' | 'HEXAGON'>('STANDARD');
  const [showHexLabels, setShowHexLabels] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [pendingDrilldown, setPendingDrilldown] = useState<string | null>(null);
  const [expressMode, setExpressMode] = useState<boolean>(false);
  const [expressStatus, setExpressStatus] = useState<PlaceStatus>('VISITED');
  const [subRegions, setSubRegions] = useState<TopoRegion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [regionsReady, setRegionsReady] = useState(false);
  const [exitingSidebar, setExitingSidebar] = useState<{ countryId: string; name: string; regions: TopoRegion[] } | null>(null);
  const sidebarExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (sidebarExitTimer.current) clearTimeout(sidebarExitTimer.current);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      setSearchQuery('');
    });
  }, [activeCountry]);

  useEffect(() => {
    let active = true;
    let cancelPreload = () => {};
    if (activeCountry) {
      Promise.resolve().then(() => { if (active) setRegionsReady(false); });
      fetchSubRegions(activeCountry)
        .then((regions) => {
          if (!active) return;
          setSubRegions(regions);
          setRegionsReady(true);
          cancelPreload = preloadPlaceFlags(regions.map((region) => region.id));
        })
        .catch(() => {
          if (active) {
            setSubRegions([]);
            setRegionsReady(true);
          }
        });
    } else {
      Promise.resolve().then(() => {
        if (active) setSubRegions([]);
      });
    }
    return () => {
      active = false;
      cancelPreload();
    };
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



  const territories = activeCountry ? getTerritoriesForCountry(activeCountry) : [];

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

  // Drill-down trigger — Phase 1: zoom into country on world map first
  const handleDrillDown = useCallback(
    (countryId: string) => {
      setMapStyle('STANDARD');
      setPendingDrilldown(countryId);
    },
    [setMapStyle]
  );

  // Phase 2 callback: world map zoom-in is done, now switch to drilldown view
  const handleDrilldownReady = useCallback(
    (countryId: string) => {
      if (sidebarExitTimer.current) clearTimeout(sidebarExitTimer.current);
      setExitingSidebar(null);
      setPendingDrilldown(null);
      setRegionsReady(false);
      setHighlightedCountryA3(null);
      setActiveCountry(countryId);
    },
    []
  );

  // Search handlers
  const handleCountrySelect = useCallback((countryId: string) => {
    setHighlightedCountryA3(countryId);
  }, []);

  const handleSearchClear = useCallback(() => {
    setHighlightedCountryA3(null);
    setSelectedRegion(null);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedRegion(null);
    setHighlightedCountryA3(null);
  }, []);

  const handleResultSelect = useCallback((result: SearchResult) => {
    if (result.kind === 'country') {
      setSelectedRegion(null);
      return;
    }
    const selection: SelectedRegion = {
      sourceId: result.id,
      countryId: result.countryId,
      regionId: result.kind === 'place' ? result.regionId : result.kind === 'region' ? result.id : result.territoryId,
      placeName: result.kind === 'region' ? result.matchedPlace : result.name,
      coordinates: result.kind === 'locality' ? result.coordinates : undefined,
      areaName: result.kind === 'locality' ? result.areaName : undefined,
      requiresAreaChoice: result.kind === 'locality' && isMultiRegionLocality(result.countryId, result.name),
    };
    setSelectedRegion(selection);
    if (activeCountry === result.countryId) {
      setHighlightedCountryA3(selection.regionId ?? null);
    } else {
      handleDrillDown(result.countryId);
    }
  }, [activeCountry, handleDrillDown]);

  useEffect(() => {
    if (!selectedRegion?.coordinates || selectedRegion.regionId || selectedRegion.resolutionFailed ||
      selectedRegion.requiresAreaChoice ||
      selectedRegion.countryId !== activeCountry || !regionsReady) return;
    const { sourceId, countryId, coordinates, areaName } = selectedRegion;
    let active = true;
    resolvePlaceRegion(countryId, coordinates, subRegions, undefined, areaName)
      .then((region) => {
        if (!active) return;
        setSelectedRegion((current) => current?.sourceId === sourceId
          ? { ...current, regionId: region?.id, resolutionFailed: !region } : current);
      })
      .catch(() => {
        if (active) setSelectedRegion((current) => current?.sourceId === sourceId
          ? { ...current, resolutionFailed: true } : current);
      });
    return () => { active = false; };
  }, [selectedRegion, activeCountry, regionsReady, subRegions]);

  const selectedRegionData = selectedRegion?.regionId && activeCountry === selectedRegion.countryId
    ? subRegions.find((region) => region.id === selectedRegion.regionId)
    : undefined;
  const selectedStatus = selectedRegionData
    ? places[selectedRegionData.id]?.status ?? places[activeCountry!]?.regions?.[selectedRegionData.id] ?? 'NONE'
    : 'NONE';
  const selectedIsTerritory = selectedRegionData && territories.some((territory) => territory.id === selectedRegionData.id);

  const sidebarCountry = activeCountry ?? exitingSidebar?.countryId ?? null;
  const sidebarCountryName = activeCountry ? activeCountryName : exitingSidebar?.name;
  const sidebarRegions = activeCountry ? subRegions : exitingSidebar?.regions ?? [];
  const sidebarExiting = !activeCountry && !!exitingSidebar;
  const sidebarTerritories = sidebarCountry ? getTerritoriesForCountry(sidebarCountry) : [];

  const handleBackToWorld = () => {
    if (!activeCountry) return;
    hideMapTooltip();
    if (sidebarExitTimer.current) clearTimeout(sidebarExitTimer.current);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setExitingSidebar(reduceMotion ? null : { countryId: activeCountry, name: activeCountryName, regions: subRegions });
    setActiveCountry(null);
    setSelectedRegion(null);
    setHighlightedCountryA3(null);
    if (!reduceMotion) {
      sidebarExitTimer.current = setTimeout(() => {
        setExitingSidebar(null);
        sidebarExitTimer.current = null;
      }, 480);
    }
  };

  useEffect(() => {
    if (selectedRegionData) {
      Promise.resolve().then(() => setHighlightedCountryA3(selectedRegionData.id));
    }
  }, [selectedRegionData]);

  return (
    <div className={`survey-map-shell${expressMode && activeCountry ? ' survey-map-shell--express-drilldown' : ''}${selectedRegion && activeCountry === selectedRegion.countryId ? ' survey-map-shell--search-selection' : ''}${sidebarExiting ? ' survey-map-shell--sidebar-exiting' : ''}`}>
      {/* Floating Search Bar */}
      <MapSearchBar
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        showHexLabels={showHexLabels}
        setShowHexLabels={setShowHexLabels}
        onCountrySelect={handleCountrySelect}
        onResultSelect={handleResultSelect}
        onSearchClear={handleSearchClear}
        expressMode={expressMode}
        setExpressMode={setExpressMode}
        expressStatus={expressStatus}
        activeCountry={sidebarCountry}
        subRegions={sidebarRegions}
        subRegionsReady={regionsReady}
        className={sidebarCountry ? `map-search-bar--drilldown${sidebarExiting ? ' map-search-bar--exiting' : ''}` : ''}
        isCardGrid={cardGridMode}
        onSearchChange={handleSearchChange}
      />

      {selectedRegion && activeCountry === selectedRegion.countryId && (
        <div className="map-search-selection" aria-live="polite">
          <button type="button" className="map-search-selection__close" onClick={() => {
            setSelectedRegion(null);
            setHighlightedCountryA3(null);
          }} aria-label="Close search result"><X size={15} /></button>
          {selectedRegionData ? (
            <>
              <div className="map-search-selection__description">
                {selectedRegion.placeName && <span className="map-search-selection__place">{selectedRegion.placeName} is in</span>}
                <strong>{selectedRegionData.name}</strong>
                <span className="map-search-selection__status">{selectedStatus === 'NONE' ? 'Not marked yet' : `Marked ${selectedStatus.toLowerCase()}`}</span>
              </div>
              <div className="map-search-selection__actions" role="group" aria-label={`Mark ${selectedRegionData.name}`}>
                {([['VISITED', 'Visited', Check], ['WISHLIST', 'Wishlist', Heart], ['REVISIT', 'Revisit', RotateCcw], ['AVOID', 'Avoid', Ban]] as const).map(([status, label, Icon]) => (
                  <button type="button" key={status}
                    className={`map-search-selection__action map-search-selection__action--${status.toLowerCase()}${selectedStatus === status ? ' map-search-selection__action--active' : ''}`}
                    aria-pressed={selectedStatus === status}
                    onClick={() => {
                      const nextStatus = selectedStatus === status ? 'NONE' : status;
                      if (selectedIsTerritory) setCountryStatus(selectedRegionData.id, nextStatus);
                      else setRegionStatus(selectedRegion.countryId, selectedRegionData.id, nextStatus);
                    }}>
                    <Icon size={14} aria-hidden="true" /><span>{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="map-search-selection__message">{selectedRegion.requiresAreaChoice ? `${selectedRegion.placeName} covers several regions. Choose a specific area on the map.` : !regionsReady ? 'Loading regions…' : subRegions.length === 0 ? 'Regions unavailable. Try again when connected.' : selectedRegion.coordinates && !selectedRegion.resolutionFailed ? 'Finding its region…' : `Could not locate ${selectedRegion.placeName ?? 'that place'} in the available map data.`}</p>
          )}
        </div>
      )}

      {/* Express Mode Active Banner */}
      {expressMode && !cardGridMode && (
        <div className={`map-express-bar${activeCountry ? ' map-express-bar--drilldown' : ''}`} role="group" aria-label="Express marking status">
          <div className="map-express-bar__heading">
            <Zap size={15} fill="currentColor" aria-hidden="true" />
            <span>Express marking</span>
          </div>
          <div className="map-express-bar__statuses">
            {([['VISITED', 'Visited'], ['WISHLIST', 'Wishlist'], ['REVISIT', 'Revisit'], ['AVOID', 'Avoid']] as [PlaceStatus, string][]).map(([status, label]) => (
              <button
                type="button"
                key={status}
                onClick={() => setExpressStatus(status)}
                className={`map-express-bar__status map-express-bar__status--${status.toLowerCase()}${expressStatus === status ? ' map-express-bar__status--active' : ''}`}
                aria-label={`Mark as ${label}`}
                aria-pressed={expressStatus === status}
              >
                {status === 'VISITED' && <Check size={14} aria-hidden="true" />}
                {status === 'WISHLIST' && <Heart size={14} aria-hidden="true" />}
                {status === 'REVISIT' && <RotateCcw size={14} aria-hidden="true" />}
                {status === 'AVOID' && <Ban size={14} aria-hidden="true" />}
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setExpressMode(false)} className="map-express-bar__close" aria-label="Disable express marking" title="Disable express marking">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Territory list panel (for any country with territories) */}
      {sidebarCountry && sidebarTerritories.length > 0 && (
        <TerritoryListPanel
          key={sidebarCountry}
          activeCountry={sidebarCountry}
          territories={sidebarTerritories}
          territoryLabel={getTerritoryLabel(sidebarCountry)}
          places={places}
          onSetStatus={handleSetStatus}
          highlightedTerritoryId={sidebarExiting ? null : highlightedCountryA3}
          isExiting={sidebarExiting}
        />
      )}

      {/* Map Viewport or Card Grid */}
      <div className="survey-map-viewport">
        {cardGridMode && activeCountry ? (
          <RegionCardGrid
            activeCountry={activeCountry}
            features={cardGridFeatures}
            places={places}
            onSetRegionStatus={handleSetRegionStatus}
            searchQuery={searchQuery}
            selectedRegionId={selectedRegionData?.id}
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
            pendingDrilldown={pendingDrilldown}
            onDrilldownReady={handleDrilldownReady}
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
        drilldownHeader={sidebarCountry && (
          <div className="map-drilldown-header">
            <button
              onClick={handleBackToWorld}
              className="map-drilldown-header__back"
            >
              <ArrowLeft size={14} />
              <span>Back to World</span>
            </button>
            <div className="map-drilldown-header__info">
              <FlagImage placeId={sidebarCountry} className="map-drilldown-header__flag" />
              <span className={`map-drilldown-header__name${(sidebarCountryName?.length ?? 0) > 26 ? ' map-drilldown-header__name--long' : ''}`}>{sidebarCountryName}</span>
            </div>
          </div>
        )}
        showVisited={showVisited}
        showWishlist={showWishlist}
        showAvoid={showAvoid}
        showRevisit={showRevisit}
        setShowVisited={setShowVisited}
        setShowWishlist={setShowWishlist}
        setShowAvoid={setShowAvoid}
        setShowRevisit={setShowRevisit}
        activeCountry={sidebarCountry}
        subRegions={sidebarRegions}
      />

      {/* Country Context Menu */}
      {contextMenu && (
        <>
          <button type="button" className="map-context-dismiss" aria-label="Close place options" onClick={() => setContextMenu(null)} />
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
        </>
      )}
    </div>
  );
};
