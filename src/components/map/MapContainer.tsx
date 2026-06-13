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
    <div className="flex flex-col md:flex-row h-full w-full relative overflow-hidden bg-transparent select-none">
      {/* Sidebar Controls */}
      <aside className={`glass-panel border-r border-base-300 flex flex-col transition-all duration-300 shrink-0 z-30 
        ${isSidebarCollapsed 
          ? 'w-0 h-0 overflow-hidden opacity-0 border-r-0' 
          : 'w-full md:w-80 h-[45vh] md:h-full opacity-100'
        }`}>
        {/* Sidebar Header */}
        <div className="flex justify-between items-center p-4 border-b border-base-300/50 shrink-0">
          <span className="font-bold text-sm text-base-content tracking-wide">
            {activeCountry ? 'Country Explorer' : 'World Travel Tracker'}
          </span>
          <button 
            className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content" 
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {activeCountry ? (
            /* Sub-region Explorer Panel */
            <div className="flex flex-col gap-3">
              {/* Back Button */}
              <button 
                onClick={() => setActiveCountry(null)}
                className="btn btn-primary btn-sm w-full gap-1.5"
              >
                <ArrowLeft size={14} /> Back to World
              </button>

              {/* Active Country Metadata */}
              <div className="flex items-center gap-2 mt-1">
                {activeCountryData?.flag ? (
                  <img src={activeCountryData.flag} alt="" className="w-6 h-4.5 object-cover rounded-sm border border-base-300/40 shrink-0" />
                ) : (
                  <div className="w-6 h-4.5 bg-base-300 rounded-sm shrink-0" />
                )}
                <h3 className="text-md font-extrabold text-base-content truncate">{activeCountryName}</h3>
              </div>

              {/* Selection Mode Details Accordion */}
              <details className="accordion accordion-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                <summary className="accordion-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
                  Select Mode
                </summary>
                <div className="accordion-content grid grid-cols-2 gap-1.5 text-xs">
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
                        className={`btn btn-outline btn-xs font-medium justify-center transition-all ${
                          isActive ? 'btn-active text-primary bg-primary/10' : 'text-base-content/70 border-base-300/30'
                        }`}
                        onClick={() => setActiveMode(mode)}
                        style={{ 
                          borderColor: isActive ? activeColor : undefined,
                          color: isActive ? activeColor : undefined
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </details>

              {/* List of sub-region territories */}
              {currentConfig?.territories && currentConfig.territories.length > 0 && (
                <details className="accordion accordion-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                  <summary className="accordion-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
                    {currentConfig.territoryLabel || 'Territories'}
                  </summary>
                  <div className="accordion-content flex flex-col gap-1.5 max-h-[30vh] overflow-y-auto p-2">
                    {currentConfig.territories.map((territory) => {
                      const status = places[territory.id]?.status || 'NONE';
                      
                      const activeCardClass = 
                        status === 'VISITED' ? 'bg-accent-visited/10 border-accent-visited/25 text-accent-visited' : 
                        status === 'WISHLIST' ? 'bg-accent-wishlist/10 border-accent-wishlist/25 text-accent-wishlist' : 
                        status === 'REVISIT' ? 'bg-accent-revisit/10 border-accent-revisit/25 text-accent-revisit' : 
                        status === 'AVOID' ? 'bg-accent-avoid/10 border-accent-avoid/25 text-accent-avoid' : 
                        'bg-base-200/40 border-base-300/45 text-base-content/85';

                      return (
                        <div key={territory.id} className={`flex items-center justify-between p-1.5 rounded-lg border text-xs gap-2 transition-all ${activeCardClass}`}>
                          <div className="flex items-center gap-2 min-width-0">
                            {territory.flagCode ? (
                              <img 
                                src={`https://flagcdn.com/24x18/${territory.flagCode}.png`} 
                                alt=""
                                className="w-5 h-3.5 object-cover rounded-sm border border-base-300/20 shrink-0"
                              />
                            ) : (
                              <div 
                                className="w-4 h-4 rounded-full border border-base-300/20 shrink-0" 
                                style={{ background: getFillColor(status, false, true, true, true, true, showRevisit) }}
                              />
                            )}
                            <span className="truncate font-medium">
                              {territory.name}
                            </span>
                          </div>
                          
                          <div className="flex gap-0.5 shrink-0">
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'VISITED' ? 'NONE' : 'VISITED')}
                              className={`btn btn-square btn-xs ${status === 'VISITED' ? 'btn-success text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                              title="Visited"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                              className={`btn btn-square btn-xs ${status === 'WISHLIST' ? 'btn-secondary text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                              title="Wishlist"
                            >
                              <Heart size={11} />
                            </button>
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'REVISIT' ? 'NONE' : 'REVISIT')}
                              className={`btn btn-square btn-xs ${status === 'REVISIT' ? 'btn-warning text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                              title="Revisit"
                            >
                              <RotateCcw size={11} />
                            </button>
                            <button
                              onClick={() => setCountryStatus(territory.id, status === 'AVOID' ? 'NONE' : 'AVOID')}
                              className={`btn btn-square btn-xs ${status === 'AVOID' ? 'btn-error text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                              title="Avoid"
                            >
                              <Ban size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          ) : (
            /* Global View Controls Panel */
            <>
              {/* Search Control */}
              <div 
                ref={searchContainerRef} 
                className="card bg-base-200/40 border border-base-300/40 p-3 rounded-xl relative flex flex-col gap-1.5 shrink-0"
              >
                <span className="text-[10px] font-bold tracking-wider text-base-content/50 uppercase">
                  Search Countries
                </span>
                <div className="relative w-full">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                  <input 
                    type="text"
                    className="input input-bordered input-sm !pl-8 !pr-8 w-full text-xs" 
                    placeholder="Find Country..."
                    value={searchVal} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchVal(val);
                      setIsDropdownOpen(true);
                      setKbIndex(-1);
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content p-0.5"
                      title="Clear Search"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
                
                {isDropdownOpen && filteredSuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-1 bg-base-200/95 backdrop-blur-md border border-base-300/60 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-[60] list-none p-1 flex flex-col gap-0.5">
                    {filteredSuggestions.map((country, idx) => {
                      const isHighlighted = idx === kbIndex;
                      const isSelected = country.id === highlightedCountryA3;
                      
                      return (
                        <li 
                          key={country.id}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-base-content
                            ${isHighlighted ? 'bg-base-300' : ''} 
                            ${isSelected ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-primary/10'}`}
                          onClick={() => selectCountry(country)}
                          onMouseEnter={() => setKbIndex(idx)}
                        >
                          {country.flag ? (
                            <img src={country.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm border border-base-300/40 shrink-0" />
                          ) : (
                            <div className="w-5 h-3.5 bg-base-300 rounded-sm border border-base-300/40 shrink-0" />
                          )}
                          <span className="truncate flex-1">{country.name}</span>
                          <span className="text-[10px] opacity-40 font-mono">{country.id}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Marking Tool Details Accordion */}
              <details className="accordion accordion-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                <summary className="accordion-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
                  Marking Tool
                </summary>
                <div className="accordion-content flex flex-col gap-1 text-xs">
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
                        className={`btn btn-outline btn-xs font-medium justify-start gap-2.5 w-full transition-all ${
                          isActive ? 'btn-active text-primary bg-primary/10' : 'text-base-content/80 border-base-300/30 hover:text-primary'
                        }`}
                        onClick={() => setActiveMode(mode)}
                        style={{
                          borderColor: isActive ? activeColor : undefined,
                          color: isActive ? activeColor : undefined
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activeColor }} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>

              {/* Map Visibility filters Details Accordion */}
              <details className="accordion accordion-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                <summary className="accordion-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
                  Visibility Filters
                </summary>
                <div className="accordion-content flex flex-col gap-1 text-xs">
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
                      className={`btn btn-outline btn-xs font-medium justify-start gap-2.5 w-full transition-all ${
                        shown ? 'btn-active' : 'opacity-40 text-base-content/60 border-base-300/30 hover:text-base-content'
                      }`}
                      onClick={() => setter(!shown)}
                      style={{ 
                        borderColor: shown ? color : undefined, 
                        color: shown ? color : undefined,
                        background: shown ? `${color}15` : undefined
                      }}
                    >
                      {shown ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </details>

              {/* Map Type Config Details Accordion */}
              <details className="accordion accordion-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                <summary className="accordion-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
                  Presentation Style
                </summary>
                <div className="accordion-content flex flex-col gap-2 text-xs">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      className={`btn btn-xs ${mapStyle === 'STANDARD' ? 'btn-primary' : 'btn-outline border-base-300/30 text-base-content/80 hover:text-primary'}`}
                      onClick={() => setMapStyle('STANDARD')}
                    >
                      Standard
                    </button>
                    <button 
                      className={`btn btn-xs ${mapStyle === 'HEXAGON' ? 'btn-primary' : 'btn-outline border-base-300/30 text-base-content/80 hover:text-primary'}`}
                      onClick={() => setMapStyle('HEXAGON')}
                    >
                      Hexagon
                    </button>
                  </div>
                  {mapStyle === 'HEXAGON' && (
                    <label className="flex items-center gap-2 cursor-pointer mt-1 text-[10px] text-base-content/70 select-none p-1 rounded hover:bg-base-300/10">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-primary checkbox-xs"
                        checked={showHexLabels} 
                        onChange={e => setShowHexLabels(e.target.checked)} 
                      />
                      <span>Display country labels</span>
                    </label>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      </aside>

      {/* Map Viewport Area */}
      <main className="flex-1 h-full w-full relative overflow-hidden flex flex-col">
        {/* Toggle Sidebar Trigger if Collapsed */}
        {isSidebarCollapsed && (
          <button 
            className="absolute top-4 left-4 btn btn-neutral btn-sm shadow-lg gap-1.5 z-40"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand Controls"
          >
            <Menu size={14} /> 
            <span className="hidden sm:inline text-xs font-semibold">Controls</span>
          </button>
        )}

        <div className="flex-1 w-full h-full relative overflow-hidden">
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-base-300/95 backdrop-blur-md border border-base-300 rounded-lg shadow-xl text-xs font-bold text-base-content select-none pointer-events-none z-40 transition-opacity">
              {tooltipContent}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
