
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { COUNTRIES, NUMERIC_TO_A3 } from '../../data/countries';
import type { Country } from '../../data/countries';
import { StandardMap } from './StandardMap';
import { HexagonMap } from './HexagonMap';
import { useStore } from '../../store/useStore';
import { drilldownRegistry } from '../../config/drilldownConfig';
import { getFillColor } from '../../utils/mapUtils';
import { 
  Eye, 
  EyeOff, 
  Menu, 
  ChevronLeft, 
  Search, 
  ArrowLeft, 
  Check, 
  Heart, 
  Ban, 
  RotateCcw
} from 'lucide-react';

export const MapContainer: React.FC = () => {
  const { places, setCountryStatus } = useStore();
  const [activeMode, setActiveMode] = useState<'VISITED' | 'WISHLIST' | 'AVOID' | 'REVISIT'>('VISITED');
  const [mapStyle, setMapStyle] = useState<'STANDARD' | 'HEXAGON'>('STANDARD');
  const [showHexLabels, setShowHexLabels] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search/Highlight feature using static countries list with custom autocomplete
  const [searchVal, setSearchVal] = useState('');
  const [highlightedCountryA3, setHighlightedCountryA3] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [kbIndex, setKbIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setKbIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fuzzy match filters
  const filteredSuggestions = useMemo(() => {
    const query = searchVal.trim().toLowerCase();
    if (!query) return [];

    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.cca2.toLowerCase().includes(query)
    );
  }, [searchVal]);

  const selectCountry = (country: Country) => {
    setSearchVal(country.name);
    setHighlightedCountryA3(country.id);
    setIsDropdownOpen(false);
    setKbIndex(-1);
  };

  const clearSearch = () => {
    setSearchVal('');
    setHighlightedCountryA3(null);
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
      setKbIndex(prev => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKbIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
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

  // Visibility toggles for each status
  const [showVisited, setShowVisited] = useState(true);
  const [showWishlist, setShowWishlist] = useState(true);
  const [showAvoid, setShowAvoid] = useState(true);
  const [showRevisit, setShowRevisit] = useState(true);

  const activeCountryData = COUNTRIES.find(c => c.id === activeCountry);
  const activeCountryName = activeCountryData ? activeCountryData.name : '';
  const currentConfig = activeCountry ? drilldownRegistry[activeCountry] : null;

  return (
    <div className="dashboard-layout">
      {/* Sidebar Controls */}
      <aside className={`dashboard-sidebar glass-panel ${isSidebarCollapsed ? 'dashboard-sidebar--collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="dashboard-sidebar-header">
          <span className="dashboard-sidebar-title">
            {activeCountry ? 'Country Explorer' : 'World Travel Tracker'}
          </span>
          <button 
            className="glass-button" 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem' }} 
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="dashboard-sidebar-scroll">
          {activeCountry ? (
            /* Sub-region Explorer Panel */
            <div className="sidebar-territory-panel">
              {/* Back Button */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button 
                  onClick={() => setActiveCountry(null)}
                  className="glass-button glass-button--primary"
                  style={{ flex: 1 }}
                >
                  <ArrowLeft size={16} /> Back to World
                </button>
              </div>

              {/* Active Country Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                {activeCountryData?.flag ? (
                  <img src={activeCountryData.flag} alt="" className="country-flag" style={{ width: '2rem', height: '1.5rem' }} />
                ) : (
                  <div className="country-flag-placeholder" style={{ width: '2rem', height: '1.5rem' }} />
                )}
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{activeCountryName}</h3>
              </div>

              {/* Selection Mode Indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Mode
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
                  {(['VISITED', 'WISHLIST', 'REVISIT', 'AVOID'] as const).map((mode) => {
                    const label = mode === 'VISITED' ? 'Visited' : mode === 'WISHLIST' ? 'Wishlist' : mode === 'REVISIT' ? 'Revisit' : 'Avoid';
                    const activeColor = 
                      mode === 'VISITED' ? 'var(--accent-visited)' : 
                      mode === 'WISHLIST' ? 'var(--accent-wishlist)' : 
                      mode === 'REVISIT' ? 'var(--accent-revisit)' : 
                      'var(--accent-avoid)';
                    const isActive = activeMode === mode;
                    return (
                      <button
                        key={mode}
                        className={`glass-button ${isActive ? 'glass-button--primary' : ''}`}
                        onClick={() => setActiveMode(mode)}
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.4rem 0.5rem',
                          borderColor: isActive ? activeColor : 'var(--glass-border)',
                          color: isActive ? activeColor : 'var(--text-secondary)'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* List of sub-region territories */}
              {currentConfig?.territories && currentConfig.territories.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {currentConfig.territoryLabel || 'Territories'}
                  </span>
                  <div className="sidebar-territory-scroll">
                    {currentConfig.territories.map((territory) => {
                      const status = places[territory.id]?.status || 'NONE';
                      
                      const activeCardClass = 
                        status === 'VISITED' ? 'sidebar-territory-card--visited' : 
                        status === 'WISHLIST' ? 'sidebar-territory-card--wishlist' : 
                        status === 'REVISIT' ? 'sidebar-territory-card--revisit' : 
                        status === 'AVOID' ? 'sidebar-territory-card--avoid' : '';

                      return (
                        <div key={territory.id} className={`sidebar-territory-card ${activeCardClass}`}>
                          {territory.flagCode ? (
                            <img 
                              src={`https://flagcdn.com/24x18/${territory.flagCode}.png`} 
                              alt=""
                              className="sidebar-territory-card-flag"
                            />
                          ) : (
                            <div 
                              className="sidebar-territory-card-circle" 
                              style={{ background: getFillColor(status, false, true, true, true, true, showRevisit) }}
                            />
                          )}
                          <span className="sidebar-territory-card-name">
                            {territory.name}
                          </span>
                          
                          <div className="country-actions">
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'VISITED' ? 'NONE' : 'VISITED')}
                              className={`action-btn ${status === 'VISITED' ? 'action-btn--visited' : ''}`}
                              title="Visited"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                              className={`action-btn ${status === 'WISHLIST' ? 'action-btn--wishlist' : ''}`}
                              title="Wishlist"
                            >
                              <Heart size={12} />
                            </button>
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'REVISIT' ? 'NONE' : 'REVISIT')}
                              className={`action-btn ${status === 'REVISIT' ? 'action-btn--revisit' : ''}`}
                              title="Revisit"
                            >
                              <RotateCcw size={12} />
                            </button>
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'AVOID' ? 'NONE' : 'AVOID')}
                              className={`action-btn ${status === 'AVOID' ? 'action-btn--avoid' : ''}`}
                              title="Avoid"
                            >
                              <Ban size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Global View Controls Panel */
            <>
              {/* Search Control */}
              <div 
                ref={searchContainerRef} 
                className="autocomplete-search-container"
              >
                <span className="autocomplete-search-label">
                  Search Countries
                </span>
                <div className="autocomplete-input-wrapper">
                  <Search size={16} className="autocomplete-search-icon" />
                  <input 
                    type="text"
                    className="glass-input autocomplete-input" 
                    placeholder="Find Country..."
                    value={searchVal} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchVal(val);
                      setIsDropdownOpen(true);
                      setKbIndex(-1);
                      // Proactively find exact match to highlight immediately on typing
                      const found = COUNTRIES.find(c => c.name.toLowerCase() === val.toLowerCase());
                      setHighlightedCountryA3(found ? found.id : null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                  />
                  {searchVal && (
                    <button 
                      type="button" 
                      onClick={clearSearch} 
                      className="autocomplete-clear-btn"
                      title="Clear Search"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
                
                {isDropdownOpen && filteredSuggestions.length > 0 && (
                  <ul className="autocomplete-dropdown glass-panel">
                    {filteredSuggestions.map((country, idx) => {
                      const isHighlighted = idx === kbIndex;
                      const isSelected = country.id === highlightedCountryA3;
                      
                      return (
                        <li 
                          key={country.id}
                          className={`autocomplete-dropdown-item ${isHighlighted ? 'autocomplete-dropdown-item--highlighted' : ''} ${isSelected ? 'autocomplete-dropdown-item--selected' : ''}`}
                          onClick={() => selectCountry(country)}
                          onMouseEnter={() => setKbIndex(idx)}
                        >
                          {country.flag ? (
                            <img src={country.flag} alt="" className="autocomplete-item-flag" />
                          ) : (
                            <div className="country-flag-placeholder autocomplete-item-flag" />
                          )}
                          <span className="autocomplete-item-name">{country.name}</span>
                          <span className="autocomplete-item-code">{country.id}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Selector mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Marking Tool
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {(['VISITED', 'WISHLIST', 'REVISIT', 'AVOID'] as const).map((mode) => {
                    const label = mode === 'VISITED' ? 'Mark Visited' : mode === 'WISHLIST' ? 'Mark Wishlist' : mode === 'REVISIT' ? 'Mark Revisit' : 'Mark Avoid';
                    const activeColor = 
                      mode === 'VISITED' ? 'var(--accent-visited)' : 
                      mode === 'WISHLIST' ? 'var(--accent-wishlist)' : 
                      mode === 'REVISIT' ? 'var(--accent-revisit)' : 
                      'var(--accent-avoid)';
                    const isActive = activeMode === mode;
                    return (
                      <button 
                        key={mode}
                        className={`glass-button ${isActive ? 'glass-button--primary' : ''}`}
                        onClick={() => setActiveMode(mode)}
                        style={{
                          justifyContent: 'flex-start',
                          borderColor: isActive ? activeColor : 'var(--glass-border)',
                          color: isActive ? activeColor : 'var(--text-primary)'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeColor }} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map Visibility filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Map Visibility Filters
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {(
                    [
                      ['Visited', showVisited, setShowVisited, 'var(--accent-visited)'],
                      ['Revisit', showRevisit, setShowRevisit, 'var(--accent-revisit)'],
                      ['Wishlist', showWishlist, setShowWishlist, 'var(--accent-wishlist)'],
                      ['Avoid', showAvoid, setShowAvoid, 'var(--accent-avoid)']
                    ] as const
                  ).map(([label, shown, setter, color]) => (
                    <button
                      key={label}
                      className="glass-button"
                      onClick={() => setter(!shown)}
                      style={{ 
                        justifyContent: 'flex-start', 
                        opacity: shown ? 1 : 0.45, 
                        borderColor: shown ? color : 'var(--glass-border)', 
                        color: shown ? color : 'var(--text-secondary)'
                      }}
                    >
                      {shown ? <Eye size={14} /> : <EyeOff size={14} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Type Config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Map Presentation Style
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button 
                    className={`glass-button ${mapStyle === 'STANDARD' ? 'glass-button--primary' : ''}`}
                    onClick={() => setMapStyle('STANDARD')}
                    style={{ flex: 1 }}
                  >
                    Standard Map
                  </button>
                  <button 
                    className={`glass-button ${mapStyle === 'HEXAGON' ? 'glass-button--primary' : ''}`}
                    onClick={() => setMapStyle('HEXAGON')}
                    style={{ flex: 1 }}
                  >
                    Hexagon Map
                  </button>
                </div>
                {mapStyle === 'HEXAGON' && (
                  <label className="checkbox-label" style={{ marginTop: '0.25rem', padding: '0.25rem 0.5rem' }}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input"
                      checked={showHexLabels} 
                      onChange={e => setShowHexLabels(e.target.checked)} 
                    />
                    Display country labels in hexagons
                  </label>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Map Viewport Area */}
      <main className="dashboard-viewport">
        {/* Toggle Sidebar Trigger if Collapsed */}
        {isSidebarCollapsed && (
          <button 
            className="glass-button sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand Controls"
          >
            <Menu size={16} /> <span className="hide-mobile-text">Controls</span>
          </button>
        )}

        <div className="glass-panel" style={{ flex: 1, border: 'none', borderRadius: 0, position: 'relative', overflow: 'hidden' }}>
          {mapStyle === 'STANDARD' ? (
            <StandardMap 
              selectionMode={activeMode} 
              setTooltipContent={setTooltipContent} 
              activeCountry={activeCountry}
              setActiveCountry={setActiveCountry}
              highlightedCountry={highlightedCountryA3}
              numericToA3={NUMERIC_TO_A3}
              showVisited={showVisited}
              showWishlist={showWishlist}
              showAvoid={showAvoid}
              showRevisit={showRevisit}
            />
          ) : (
            <HexagonMap 
              selectionMode={activeMode} 
              setTooltipContent={setTooltipContent}
              highlightedCountry={highlightedCountryA3}
              showLabels={showHexLabels}
              showVisited={showVisited}
              showWishlist={showWishlist}
              showAvoid={showAvoid}
              showRevisit={showRevisit}
            />
          )}
          
          {/* Elegant Tooltip overlay */}
          {tooltipContent && (
            <div className="compare-tooltip">
              {tooltipContent}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
