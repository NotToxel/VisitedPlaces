import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Hexagon, Globe, Zap } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';
import type { Country } from '../../data/countries';
import { matchCountry } from '../../utils/searchUtils';
import type { PlaceStatus } from '../../store/useStore';
import type { TopoRegion } from '../../utils/topojsonCache';
import { getPlaceFlagUrl, getParentCountryFlagUrl } from '../../utils/flagUtils';

interface MapSearchBarProps {
  mapStyle: 'STANDARD' | 'HEXAGON';
  setMapStyle: (style: 'STANDARD' | 'HEXAGON') => void;
  showHexLabels: boolean;
  setShowHexLabels: (show: boolean) => void;
  onCountrySelect: (countryId: string) => void;
  onSearchClear: () => void;
  expressMode?: boolean;
  setExpressMode?: (active: boolean) => void;
  expressStatus?: PlaceStatus;
  activeCountry?: string | null;
  subRegions?: TopoRegion[];
  className?: string;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  mapStyle,
  setMapStyle,
  showHexLabels,
  setShowHexLabels,
  onCountrySelect,
  onSearchClear,
  expressMode = false,
  setExpressMode,
  expressStatus = 'VISITED',
  activeCountry = null,
  subRegions = [],
  className = '',
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [kbIndex, setKbIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

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
      onSearchClear();
    });
  }, [activeCountry, onSearchClear]);

  const filteredSuggestions = useMemo(() => {
    const query = searchVal.trim();
    if (!query) return [];
    if (activeCountry) {
      const lowerQuery = query.toLowerCase();
      return subRegions.filter(
        (sr) => sr.name.toLowerCase().includes(lowerQuery) || sr.id.toLowerCase().includes(lowerQuery)
      );
    }
    return COUNTRIES.filter(
      (c) => matchCountry(c.name, c.id, c.cca2, query)
    );
  }, [searchVal, activeCountry, subRegions]);

  const selectCountry = (country: Country | TopoRegion) => {
    setSearchVal(country.name);
    onCountrySelect(country.id);
    setIsDropdownOpen(false);
    setKbIndex(-1);
  };

  const clearSearch = () => {
    setSearchVal('');
    onSearchClear();
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
        selectCountry(filteredSuggestions[kbIndex]);
      } else if (filteredSuggestions.length > 0) {
        selectCountry(filteredSuggestions[0]);
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
          placeholder={activeCountry ? "Find region..." : "Find country..."}
          value={searchVal}
          onChange={(e) => {
            const val = e.target.value;
            setSearchVal(val);
            setIsDropdownOpen(true);
            setKbIndex(-1);
            if (activeCountry) {
              const found = subRegions.find((sr) => sr.name.toLowerCase() === val.toLowerCase());
              if (found) onCountrySelect(found.id);
            } else {
              const found = COUNTRIES.find((c) => c.name.toLowerCase() === val.toLowerCase());
              if (found) onCountrySelect(found.id);
            }
          }}
          onFocus={() => setIsDropdownOpen(true)}
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
            >
              <Globe size={14} />
            </button>
            <button
              className={`map-search-bar__style-btn ${mapStyle === 'HEXAGON' ? 'map-search-bar__style-btn--active' : ''}`}
              onClick={() => setMapStyle('HEXAGON')}
              title="Hexagon Map"
            >
              <Hexagon size={14} />
            </button>
          </>
        )}
        
        {/* Express Mode Toggle */}
        <button
          className={`map-search-bar__style-btn ${expressMode ? 'map-search-bar__style-btn--active text-amber-500 border-amber-500/20 bg-amber-500/5' : ''}`}
          onClick={() => setExpressMode?.(!expressMode)}
          title={expressMode ? `Disable Express Mode (${expressStatus.charAt(0) + expressStatus.slice(1).toLowerCase()})` : "Enable Express Mode"}
        >
          <Zap size={13.5} fill={expressMode ? "currentColor" : "none"} className={expressMode ? "text-amber-500 animate-pulse" : ""} />
        </button>
        {!activeCountry && mapStyle === 'HEXAGON' && (
          <label className="map-search-bar__hex-label-toggle" title="Show country labels on hexagons">
            <input
              type="checkbox"
              checked={showHexLabels}
              onChange={(e) => setShowHexLabels(e.target.checked)}
            />
            <span>Labels</span>
          </label>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && filteredSuggestions.length > 0 && (
        <ul className="map-search-bar__dropdown">
          {filteredSuggestions.map((item, idx) => {
            const isHighlighted = idx === kbIndex;
            const flag = 'flag' in item ? (item as Country).flag : undefined;
            return (
              <li
                key={item.id}
                className={`map-search-bar__dropdown-item ${isHighlighted ? 'map-search-bar__dropdown-item--highlighted' : ''}`}
                onClick={() => selectCountry(item)}
                onMouseEnter={() => setKbIndex(idx)}
              >
                {activeCountry ? (
                  <img
                    src={getPlaceFlagUrl(item.id) || getParentCountryFlagUrl(item.id) || ''}
                    alt=""
                    className="map-search-bar__dropdown-flag object-cover rounded-sm"
                    onError={(e) => {
                      const fallback = getParentCountryFlagUrl(item.id);
                      if (fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                ) : flag ? (
                  <img
                    src={flag}
                    alt=""
                    className="map-search-bar__dropdown-flag"
                  />
                ) : (
                  <div className="map-search-bar__dropdown-flag-placeholder" />
                )}
                <span className="map-search-bar__dropdown-name">{item.name}</span>
                {!activeCountry && <span className="map-search-bar__dropdown-code">{item.id}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
