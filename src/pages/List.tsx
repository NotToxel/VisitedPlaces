import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { COUNTRIES } from '../data/countries';
import type { Country } from '../data/countries';
import { useStore } from '../store/useStore';
import type { PlaceStatus } from '../store/useStore';
import { Search, Filter, Check, Heart, ChevronDown, ChevronRight, Map as MapIcon, Ban, Loader2, RotateCcw } from 'lucide-react';
import { fetchSubRegions, getSubRegionUrl } from '../utils/topojsonCache';
import type { TopoRegion } from '../utils/topojsonCache';

const List: React.FC = () => {
  const { places, setCountryStatus } = useStore();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [searchSubRegions, setSearchSubRegions] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VISITED' | 'WISHLIST' | 'REVISIT' | 'AVOID' | 'UNSELECTED'>('ALL');
  const [collapsedContinents, setCollapsedContinents] = useState<Record<string, boolean>>({});

  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [subRegionsByCountry, setSubRegionsByCountry] = useState<Record<string, TopoRegion[]>>({});
  const [loadingSubRegions, setLoadingSubRegions] = useState<Record<string, boolean>>({});

  const loadSubRegions = useCallback(async (id: string) => {
    if (subRegionsByCountry[id] || loadingSubRegions[id]) return;
    setLoadingSubRegions(prev => ({ ...prev, [id]: true }));
    const regions = await fetchSubRegions(id);
    setSubRegionsByCountry(prev => ({ ...prev, [id]: regions }));
    setLoadingSubRegions(prev => ({ ...prev, [id]: false }));
  }, [subRegionsByCountry, loadingSubRegions]);

  // Pre-load supporting sub-regions if the user wants to search by them
  useEffect(() => {
    if (searchSubRegions) {
      const timer = setTimeout(() => {
        loadSubRegions('USA');
        loadSubRegions('GBR');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchSubRegions, loadSubRegions]);

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => {
      const status = places[c.id]?.status || 'NONE';
      const searchVal = deferredSearch.trim().toLowerCase();
      let matchesSearch = c.name.toLowerCase().includes(searchVal);
      
      if (!matchesSearch && searchVal.length > 0 && searchSubRegions) {
        const states = subRegionsByCountry[c.id] || [];
        if (states.some(s => s.name.toLowerCase().includes(searchVal))) {
          matchesSearch = true;
        }
      }

      const matchesFilter = 
        filterMode === 'ALL' ? true :
        filterMode === 'UNSELECTED' ? status === 'NONE' :
        filterMode === status;
        
      return matchesSearch && matchesFilter;
    });
  }, [places, deferredSearch, filterMode, searchSubRegions, subRegionsByCountry]);

  // Group by continent
  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Country[]> = {};
    filteredCountries.forEach(place => {
      if (!groups[place.continent]) groups[place.continent] = [];
      groups[place.continent].push(place);
    });
    
    // Sort within each continent
    Object.keys(groups).forEach(continent => {
      groups[continent].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort continents alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, Country[]>);
  }, [filteredCountries]);

  const handleStatusChange = (id: string, newStatus: PlaceStatus) => {
    const currentStatus = places[id]?.status || 'NONE';
    setCountryStatus(id, currentStatus === newStatus ? 'NONE' : newStatus);
  };

  const toggleContinent = (continent: string) => {
    setCollapsedContinents(prev => ({
      ...prev,
      [continent]: !prev[continent]
    }));
  };

  const getCardClass = (status: PlaceStatus) => {
    const base = "card card-compact border rounded-xl transition-all duration-200 ";
    if (status === 'VISITED') return base + "bg-accent-visited/5 border-accent-visited/35 text-accent-visited shadow-[0_0_8px_-2px_var(--accent-visited)]";
    if (status === 'WISHLIST') return base + "bg-accent-wishlist/5 border-accent-wishlist/35 text-accent-wishlist shadow-[0_0_8px_-2px_var(--accent-wishlist)]";
    if (status === 'REVISIT') return base + "bg-accent-revisit/5 border-accent-revisit/35 text-accent-revisit shadow-[0_0_8px_-2px_var(--accent-revisit)]";
    if (status === 'AVOID') return base + "bg-accent-avoid/5 border-accent-avoid/35 text-accent-avoid shadow-[0_0_8px_-2px_var(--accent-avoid)]";
    return base + "bg-base-200/30 border-base-300/40 text-base-content/85 hover:bg-base-200/60";
  };

  const getSubregionRowClass = (status: PlaceStatus) => {
    const base = "flex items-center justify-between p-1 px-2.5 rounded-lg border text-[11px] font-medium transition-all gap-2 ";
    if (status === 'VISITED') return base + "bg-accent-visited/10 border-accent-visited/25 text-accent-visited";
    if (status === 'WISHLIST') return base + "bg-accent-wishlist/10 border-accent-wishlist/25 text-accent-wishlist";
    if (status === 'REVISIT') return base + "bg-accent-revisit/10 border-accent-revisit/25 text-accent-revisit";
    if (status === 'AVOID') return base + "bg-accent-avoid/10 border-accent-avoid/25 text-accent-avoid";
    return base + "bg-base-200/45 border-transparent text-base-content/75 hover:bg-base-200/80";
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4 overflow-hidden bg-transparent select-none">
      {/* Header and Controls */}
      <div className="glass-panel border border-base-300/50 p-4 rounded-2xl shrink-0 flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-md font-bold text-base-content select-none">
          <Filter size={18} className="text-primary" />
          Country Directory
        </h2>
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="relative w-full lg:w-72 shrink-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input 
              type="text" 
              className="input input-bordered input-sm pl-8 w-full text-xs" 
              placeholder="Search countries..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer text-xs text-base-content/70 select-none py-1">
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary checkbox-xs"
              checked={searchSubRegions} 
              onChange={(e) => setSearchSubRegions(e.target.checked)} 
            />
            <span>Include Sub-regions in Search</span>
          </label>
          
          <div className="flex flex-wrap gap-1 justify-end w-full lg:w-auto">
            {(['ALL', 'VISITED', 'WISHLIST', 'REVISIT', 'AVOID', 'UNSELECTED'] as const).map((mode) => (
              <button
                key={mode}
                className={`btn btn-xs ${filterMode === mode ? 'btn-primary' : 'btn-outline border-base-300 text-base-content/85 hover:text-primary'}`}
                onClick={() => setFilterMode(mode)}
              >
                {mode === 'ALL' ? 'All' : 
                 mode === 'VISITED' ? 'Visited' : 
                 mode === 'WISHLIST' ? 'Wishlist' : 
                 mode === 'REVISIT' ? 'Revisit' : 
                 mode === 'AVOID' ? 'Avoid' : 
                 'Unselected'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Panel */}
      <div className="glass-panel border border-base-300/50 p-4 rounded-2xl flex-1 overflow-y-auto flex flex-col gap-3">
        <p className="text-xs text-base-content/50 font-semibold select-none">
          Showing {filteredCountries.length} countries
        </p>

        {Object.keys(groupedPlaces).length === 0 ? (
          <div className="text-center py-12 text-sm text-base-content/50 select-none border border-dashed border-base-300 rounded-xl">
            No countries found matching your criteria.
          </div>
        ) : (
          Object.entries(groupedPlaces).map(([continent, placesInContinent]) => {
            const isCollapsed = collapsedContinents[continent];
            
            return (
              <div key={continent} className="flex flex-col">
                <h3 
                  onClick={() => toggleContinent(continent)}
                  className="flex items-center gap-1 font-bold text-xs text-base-content/90 border-b border-base-300/40 pb-1.5 mt-3 mb-2.5 cursor-pointer uppercase tracking-wider select-none hover:text-primary transition-colors"
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  {continent} ({placesInContinent.length})
                </h3>
                
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {placesInContinent.map(country => {
                      const status = places[country.id]?.status || 'NONE';
                      let isExpanded = expandedCountries[country.id];
                      let countryStates: TopoRegion[] = [];
                      const searchVal = deferredSearch.trim().toLowerCase();
                      
                      if (isExpanded || (searchVal.length > 0 && searchSubRegions)) {
                        countryStates = subRegionsByCountry[country.id] || [];
                        
                        if (searchVal.length > 0 && searchSubRegions) {
                          const matchingStates = countryStates.filter(s => s.name.toLowerCase().includes(searchVal));
                          const countryNameMatches = country.name.toLowerCase().includes(searchVal);
                          
                          if (matchingStates.length > 0) {
                            countryStates = matchingStates; 
                            if (!isExpanded && !countryNameMatches) {
                              isExpanded = true; 
                            }
                          } else if (!countryNameMatches && !isExpanded) {
                            countryStates = []; 
                          }
                        }
                      }

                      return (
                        <div key={country.id} className="flex flex-col gap-1">
                          <div className={getCardClass(status)}>
                            <div className="card-body p-3 flex flex-row items-center justify-between gap-3 text-xs w-full">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {getSubRegionUrl(country.id) !== null ? (
                                  <button
                                    className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-base-content shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isNowExpanded = !expandedCountries[country.id];
                                      setExpandedCountries(prev => ({ ...prev, [country.id]: isNowExpanded }));
                                      if (isNowExpanded) loadSubRegions(country.id);
                                    }}
                                    title="View Regions"
                                  >
                                    {loadingSubRegions[country.id] ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      isExpanded ? <ChevronDown size={12} /> : <MapIcon size={12} />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-6 shrink-0" />
                                )}

                                {country.flag ? (
                                  <img src={country.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm border border-base-300/20 shrink-0" />
                                ) : (
                                  <div className="w-5 h-3.5 bg-base-300 rounded-sm border border-base-300/20 shrink-0" />
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate font-semibold text-base-content">{country.name}</span>
                                  <span className="text-[10px] opacity-40 font-mono">{country.id}</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-0.5 shrink-0">
                                <button 
                                  onClick={() => handleStatusChange(country.id, 'VISITED')}
                                  title="Mark as Visited"
                                  className={`btn btn-square btn-xs ${status === 'VISITED' ? 'btn-success text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                                >
                                  <Check size={12} />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(country.id, 'WISHLIST')}
                                  title="Add to Wishlist"
                                  className={`btn btn-square btn-xs ${status === 'WISHLIST' ? 'btn-secondary text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                                >
                                  <Heart size={12} />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(country.id, 'REVISIT')}
                                  title="Mark as Revisit"
                                  className={`btn btn-square btn-xs ${status === 'REVISIT' ? 'btn-warning text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                                >
                                  <RotateCcw size={12} />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(country.id, 'AVOID')}
                                  title="Don't want to go"
                                  className={`btn btn-square btn-xs ${status === 'AVOID' ? 'btn-error text-white' : 'btn-ghost text-base-content/40 hover:text-base-content'}`}
                                >
                                  <Ban size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && countryStates.length > 0 && (
                            <div className="flex flex-col gap-1 px-3 pb-3 pt-1 border-t border-base-300/40 bg-base-300/10 rounded-b-xl">
                              {countryStates.map(state => {
                                const stateId = (state.id.toString().startsWith(`${country.id}-`)) ? state.id : `${country.id}-${state.id}`;
                                const stateStatus = places[stateId]?.status || 'NONE';

                                return (
                                  <div key={stateId} className={getSubregionRowClass(stateStatus)}>
                                    <span className="truncate flex-1 font-medium">{state.name}</span>
                                    <div className="flex gap-0.5 shrink-0">
                                      <button 
                                        className={`btn btn-square btn-xs ${stateStatus === 'VISITED' ? 'btn-success text-white' : 'btn-ghost text-base-content/30 hover:text-base-content'}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'VISITED' ? 'NONE' : 'VISITED')}
                                        title="Visited"
                                      >
                                        <Check size={11} />
                                      </button>
                                      <button 
                                        className={`btn btn-square btn-xs ${stateStatus === 'WISHLIST' ? 'btn-secondary text-white' : 'btn-ghost text-base-content/30 hover:text-base-content'}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                                        title="Wishlist"
                                      >
                                        <Heart size={11} />
                                      </button>
                                      <button 
                                        className={`btn btn-square btn-xs ${stateStatus === 'REVISIT' ? 'btn-warning text-white' : 'btn-ghost text-base-content/30 hover:text-base-content'}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'REVISIT' ? 'NONE' : 'REVISIT')}
                                        title="Mark as Revisit"
                                      >
                                        <RotateCcw size={11} />
                                      </button>
                                      <button 
                                        className={`btn btn-square btn-xs ${stateStatus === 'AVOID' ? 'btn-error text-white' : 'btn-ghost text-base-content/30 hover:text-base-content'}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'AVOID' ? 'NONE' : 'AVOID')}
                                        title="Don't want to go"
                                      >
                                        <Ban size={11} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded && countryStates.length === 0 && !loadingSubRegions[country.id] && (
                            <div className="text-[10px] text-base-content/50 font-medium px-4 py-2 bg-base-300/10 border-t border-base-300/40 rounded-b-xl italic">
                              No specific sub-regions available for map drill-down.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default List;
