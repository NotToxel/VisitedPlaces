import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Hexagon, Globe, Zap } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';
import { searchMapPlaces } from '../../utils/placeSearch';
import type { SearchResult } from '../../utils/placeSearch';
import type { PlaceStatus } from '../../store/useStore';
import type { TopoRegion } from '../../utils/topojsonCache';
import { FlagImage } from '../common/FlagImage';
import { getPlaceBucketKey, loadWorldPlaceBucket } from '../../utils/worldPlaceIndex';
import type { WorldPlace } from '../../utils/worldPlaceIndex';
import { loadWorldRegionIndex } from '../../utils/worldRegionIndex';
import type { WorldRegion } from '../../utils/worldRegionIndex';

interface MapSearchBarProps {
  mapStyle: 'STANDARD' | 'HEXAGON';
  setMapStyle: (style: 'STANDARD' | 'HEXAGON') => void;
  showHexLabels: boolean;
  setShowHexLabels: (show: boolean) => void;
  onCountrySelect: (countryId: string) => void;
  onResultSelect: (result: SearchResult) => void;
  onSearchClear: () => void;
  expressMode?: boolean;
  setExpressMode?: (active: boolean) => void;
  expressStatus?: PlaceStatus;
  activeCountry?: string | null;
  subRegions?: TopoRegion[];
  subRegionsReady?: boolean;
  className?: string;
  isCardGrid?: boolean;
  onSearchChange?: (val: string) => void;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  mapStyle,
  setMapStyle,
  showHexLabels,
  setShowHexLabels,
  onCountrySelect,
  onResultSelect,
  onSearchClear,
  expressMode = false,
  setExpressMode,
  expressStatus = 'VISITED',
  activeCountry = null,
  subRegions = [],
  subRegionsReady = true,
  className = '',
  isCardGrid = false,
  onSearchChange,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [kbIndex, setKbIndex] = useState(-1);
  const [loadedBucket, setLoadedBucket] = useState<{ key: string; places: WorldPlace[]; error: boolean } | null>(null);
  const [worldRegions, setWorldRegions] = useState<WorldRegion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const bucketKey = useMemo(() => getPlaceBucketKey(searchVal), [searchVal]);

  useEffect(() => {
    if (!bucketKey) return;
    let active = true;
    loadWorldPlaceBucket(bucketKey)
      .then((places) => { if (active) setLoadedBucket({ key: bucketKey, places, error: false }); })
      .catch(() => { if (active) setLoadedBucket({ key: bucketKey, places: [], error: true }); });
    return () => { active = false; };
  }, [bucketKey]);

  useEffect(() => {
    if (!bucketKey || activeCountry) return;
    let active = true;
    loadWorldRegionIndex().then((regions) => {
      if (active) setWorldRegions(regions);
    }).catch(() => {});
    return () => { active = false; };
  }, [bucketKey, activeCountry]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setKbIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search input when activeCountry changes (entering/exiting sub-region view)
  useEffect(() => {
    Promise.resolve().then(() => {
      setSearchVal('');
      setIsDropdownOpen(false);
      setKbIndex(-1);
    });
  }, [activeCountry]);

  const filteredSuggestions = useMemo(
    () => searchMapPlaces(searchVal, activeCountry, subRegions,
      loadedBucket?.key === bucketKey ? loadedBucket.places : [], worldRegions),
    [searchVal, activeCountry, subRegions, loadedBucket, bucketKey, worldRegions]
  );
  const placeIndexLoading = Boolean(bucketKey && loadedBucket?.key !== bucketKey);
  const placeIndexError = Boolean(bucketKey && loadedBucket?.key === bucketKey && loadedBucket.error);

  const selectResult = (result: SearchResult) => {
    setSearchVal(result.name);
    onSearchChange?.(result.name);
    if (result.kind === 'country') onCountrySelect(result.id);
    onResultSelect(result);
    setIsDropdownOpen(false);
    setKbIndex(-1);
    (document.activeElement as HTMLElement)?.blur();
  };

  const clearSearch = () => {
    setSearchVal('');
    onSearchClear();
    onSearchChange?.('');
    setIsDropdownOpen(false);
    setKbIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKbIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKbIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (kbIndex >= 0 && kbIndex < filteredSuggestions.length) {
        selectResult(filteredSuggestions[kbIndex]);
      } else if (filteredSuggestions.length > 0) {
        selectResult(filteredSuggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setKbIndex(-1);
    }
  };

  return (
    <div className={`map-search-bar ${className}`} ref={containerRef}>
      {/* Search Input */}
      <div className="map-search-bar__search">
        <Search size={14} className="map-search-bar__search-icon" />
        <input
          type="text"
          className="map-search-bar__input"
          placeholder={activeCountry ? "Find a region or place" : "Find a country or place"}
          aria-label={activeCountry ? "Find a region or place" : "Find a country or place"}
          aria-expanded={isDropdownOpen && Boolean(searchVal.trim())}
          aria-controls="map-search-suggestions"
          autoComplete="off"
          value={searchVal}
          onChange={(e) => {
            const val = e.target.value;
            setSearchVal(val);
            onSearchChange?.(val);
            setIsDropdownOpen(true);
            setKbIndex(-1);
          }}
          onFocus={() => {
            setIsDropdownOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {searchVal && (
          <button
            type="button"
            onClick={clearSearch}
            className="map-search-bar__clear"
            title="Clear Search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="map-search-bar__divider" />

      {/* Map Style & Express Mode Toggles */}
      <div className="map-search-bar__style-toggle">
        {!activeCountry && (
          <>
            <button
              className={`map-search-bar__style-btn ${mapStyle === 'STANDARD' ? 'map-search-bar__style-btn--active' : ''}`}
              onClick={() => setMapStyle('STANDARD')}
              title="Standard Map"
              aria-label="World map"
              aria-pressed={mapStyle === 'STANDARD'}
            >
              <Globe size={14} />
              <span className="map-search-bar__style-label">World</span>
            </button>
            <button
              className={`map-search-bar__style-btn ${mapStyle === 'HEXAGON' ? 'map-search-bar__style-btn--active' : ''}`}
              onClick={() => setMapStyle('HEXAGON')}
              title="Hexagon Map"
              aria-label="Hexagon map"
              aria-pressed={mapStyle === 'HEXAGON'}
            >
              <Hexagon size={14} />
              <span className="map-search-bar__style-label">Hex</span>
            </button>
          </>
        )}
        
        {/* Express Mode Toggle */}
        {!isCardGrid && (
          <button
            className={`map-search-bar__style-btn map-search-bar__express-btn${expressMode ? ' map-search-bar__style-btn--active map-search-bar__express-btn--active' : ''}`}
            onClick={() => setExpressMode?.(!expressMode)}
            title={expressMode ? `Disable Express Mode (${expressStatus.charAt(0) + expressStatus.slice(1).toLowerCase()})` : "Enable Express Mode"}
            aria-label={expressMode ? 'Disable express marking' : 'Enable express marking'}
            aria-pressed={expressMode}
          >
            <Zap size={14} fill={expressMode ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}
        {!activeCountry && mapStyle === 'HEXAGON' && (
          <label className="map-search-bar__hex-label-toggle" title="Show country labels on hexagons">
            <input
              type="checkbox"
              className="survey-checkbox"
              checked={showHexLabels}
              onChange={(e) => setShowHexLabels(e.target.checked)}
            />
            <span>Labels</span>
          </label>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && searchVal.trim() && (
        <ul id="map-search-suggestions" className="map-search-bar__dropdown" aria-label="Search suggestions">
          {filteredSuggestions.map((item, idx) => {
            const isHighlighted = idx === kbIndex;
            return (
              <li
                key={item.id}
                className={`map-search-bar__dropdown-item ${isHighlighted ? 'map-search-bar__dropdown-item--highlighted' : ''}`}
              >
                <button type="button" className="map-search-bar__dropdown-button"
                  onClick={() => selectResult(item)} onMouseEnter={() => setKbIndex(idx)}>
                  <FlagImage
                  placeId={item.kind === 'country' ? item.id : item.countryId}
                    className="map-search-bar__dropdown-flag object-cover rounded-sm"
                  />
                  <span className="map-search-bar__dropdown-name">
                    {item.name}
                    {item.kind === 'place' && <small className="map-search-bar__dropdown-detail">{item.regionName} · {COUNTRIES.find((country) => country.id === item.countryId)?.name}</small>}
                    {item.kind === 'locality' && <small className="map-search-bar__dropdown-detail">{item.areaName ? `${item.areaName} · ` : ''}{COUNTRIES.find((country) => country.id === item.countryId)?.name}</small>}
                    {item.kind === 'region' && item.matchedPlace && <small className="map-search-bar__dropdown-detail">Place match: {item.matchedPlace}</small>}
                    {item.kind === 'region' && !activeCountry && <small className="map-search-bar__dropdown-detail">Region · {COUNTRIES.find((country) => country.id === item.countryId)?.name}</small>}
                  </span>
                  {item.kind === 'country' && <span className="map-search-bar__dropdown-code">{item.id}</span>}
                </button>
              </li>
            );
          })}
          {filteredSuggestions.length === 0 && (
            <li className="map-search-bar__dropdown-empty">{placeIndexLoading || (activeCountry && !subRegionsReady) ? 'Searching places…' : placeIndexError ? 'Place search unavailable. Try again when connected.' : activeCountry && subRegions.length === 0 ? 'Regions unavailable. Try again when connected.' : 'No matching places or regions.'}</li>
          )}
        </ul>
      )}
    </div>
  );
};
