import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { COUNTRIES } from '../data/countries';
import type { Country } from '../data/countries';
import { useStore } from '../store/useStore';
import type { PlaceStatus } from '../store/useStore';
import { 
  Search, 
  Filter, 
  Check, 
  Heart, 
  ChevronDown, 
  ChevronRight, 
  Ban, 
  RotateCcw, 
  Loader2, 
  X, 
  Map, 
  Layers, 
  Trophy,
  Globe
} from 'lucide-react';
import { fetchSubRegions, hasDrilldownSupport } from '../utils/topojsonCache';
import type { TopoRegion } from '../utils/topojsonCache';
import { getPlaceFlagUrl, getParentCountryFlagUrl } from '../utils/flagUtils';
import { fuzzyMatch, matchCountry } from '../utils/searchUtils';

const List: React.FC = () => {
  const { places, setCountryStatus, neDataLoaded } = useStore();
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [searchSubRegions, setSearchSubRegions] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VISITED' | 'WISHLIST' | 'REVISIT' | 'AVOID' | 'UNSELECTED'>('ALL');
  const [collapsedContinents, setCollapsedContinents] = useState<Record<string, boolean>>({});

  // Sub-region loading & selection
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [subRegionSearch, setSubRegionSearch] = useState('');
  const [subRegionsByCountry, setSubRegionsByCountry] = useState<Record<string, TopoRegion[]>>({});
  const [loadingSubRegions, setLoadingSubRegions] = useState<Record<string, boolean>>({});

  // Fetch subregions helper
  const loadSubRegions = useCallback(async (id: string) => {
    if (subRegionsByCountry[id] || loadingSubRegions[id]) return;
    setLoadingSubRegions(prev => ({ ...prev, [id]: true }));
    const regions = await fetchSubRegions(id);
    setSubRegionsByCountry(prev => ({ ...prev, [id]: regions }));
    setLoadingSubRegions(prev => ({ ...prev, [id]: false }));
  }, [subRegionsByCountry, loadingSubRegions]);

  // When sub-region search is enabled, bulk-load sub-regions for every country.
  // The NE admin-1 GeoJSON is already cached in memory after the initial fetch,
  // so each fetchSubRegions call is just an in-memory filter — effectively free.
  // We re-run whenever neDataLoaded flips to true so countries loaded after the
  // toggle is set also get their sub-regions populated.
  useEffect(() => {
    if (!searchSubRegions) return;
    const timer = setTimeout(() => {
      COUNTRIES.forEach(c => loadSubRegions(c.id));
    }, 0);
    return () => clearTimeout(timer);
  }, [searchSubRegions, neDataLoaded, loadSubRegions]);

  // Trigger sub-regions load when a country with sub-regions is selected
  useEffect(() => {
    if (selectedCountryId && hasDrilldownSupport(selectedCountryId)) {
      Promise.resolve().then(() => {
        loadSubRegions(selectedCountryId);
      });
    }
  }, [selectedCountryId, loadSubRegions]);

  // Handle direct country status click
  const handleStatusChange = (id: string, newStatus: PlaceStatus) => {
    const currentStatus = places[id]?.status || 'NONE';
    setCountryStatus(id, currentStatus === newStatus ? 'NONE' : newStatus);
  };

  // Bulk actions
  const handleMarkAllVisited = (countryId: string) => {
    const regions = subRegionsByCountry[countryId] || [];
    regions.forEach(r => {
      setCountryStatus(r.id, 'VISITED');
    });
    setCountryStatus(countryId, 'VISITED');
  };

  const handleClearAllRegions = (countryId: string) => {
    const regions = subRegionsByCountry[countryId] || [];
    regions.forEach(r => {
      setCountryStatus(r.id, 'NONE');
    });
    setCountryStatus(countryId, 'NONE');
  };

  // Find country details
  const selectedCountry = useMemo(() => {
    return COUNTRIES.find(c => c.id === selectedCountryId) || null;
  }, [selectedCountryId]);

  // Filter countries list
  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => {
      const status = places[c.id]?.status || 'NONE';
      const searchVal = deferredSearch.trim();
      let matchesSearch = matchCountry(c.name, c.id, c.cca2, searchVal);
      
      if (!matchesSearch && searchVal.length > 0 && searchSubRegions) {
        const states = subRegionsByCountry[c.id] || [];
        if (states.some(s => fuzzyMatch(s.name, searchVal))) {
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

  // Group countries by continent
  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Country[]> = {};
    filteredCountries.forEach(place => {
      if (!groups[place.continent]) groups[place.continent] = [];
      groups[place.continent].push(place);
    });
    
    // Sort alphabetically within continents
    Object.keys(groups).forEach(continent => {
      groups[continent].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort continents alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, Country[]>);
  }, [filteredCountries]);

  // Toggle continent section
  const toggleContinent = (continent: string) => {
    setCollapsedContinents(prev => ({
      ...prev,
      [continent]: !prev[continent]
    }));
  };

  // Get status color styling
  const getCardBorderAndBg = (status: PlaceStatus, isSelected: boolean) => {
    let base = "border rounded-2xl transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between gap-3 min-h-[96px] ";
    
    if (isSelected) {
      base += "ring-2 ring-primary border-primary bg-primary/5 shadow-[0_0_12px_rgba(122,162,247,0.15)] ";
      return base;
    }

    if (status === 'VISITED') return base + "bg-accent-visited/5 border-accent-visited/35 hover:bg-accent-visited/10 text-accent-visited shadow-[0_2px_8px_-3px_rgba(158,206,106,0.1)]";
    if (status === 'WISHLIST') return base + "bg-accent-wishlist/5 border-accent-wishlist/35 hover:bg-accent-wishlist/10 text-accent-wishlist shadow-[0_2px_8px_-3px_rgba(187,154,247,0.1)]";
    if (status === 'REVISIT') return base + "bg-accent-revisit/5 border-accent-revisit/35 hover:bg-accent-revisit/10 text-accent-revisit shadow-[0_2px_8px_-3px_rgba(255,158,100,0.1)]";
    if (status === 'AVOID') return base + "bg-accent-avoid/5 border-accent-avoid/35 hover:bg-accent-avoid/10 text-accent-avoid shadow-[0_2px_8px_-3px_rgba(239,68,68,0.1)]";
    
    return base + "bg-base-200/25 border-base-300/40 text-base-content/85 hover:bg-base-200/50 hover:border-base-300/70";
  };

  // Count visited subregions dynamically
  const getSubregionsProgressString = useCallback((countryId: string) => {
    const isCurated = countryId === 'USA' || countryId === 'GBR';
    if (!neDataLoaded && !isCurated && !subRegionsByCountry[countryId]) {
      return 'Loading...';
    }
    const visited = Object.keys(places).filter(k => k.startsWith(`${countryId}-`) && (places[k]?.status === 'VISITED' || places[k]?.status === 'REVISIT')).length;
    const regions = subRegionsByCountry[countryId];
    if (regions && regions.length > 0) {
      return `${visited}/${regions.length} Visited`;
    }
    return visited > 0 ? `${visited} Visited` : 'Sub-regions';
  }, [places, subRegionsByCountry, neDataLoaded]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = COUNTRIES.length;
    const visited = COUNTRIES.filter(c => places[c.id]?.status === 'VISITED').length;
    const wishlist = COUNTRIES.filter(c => places[c.id]?.status === 'WISHLIST').length;
    const revisit = COUNTRIES.filter(c => places[c.id]?.status === 'REVISIT').length;
    const avoid = COUNTRIES.filter(c => places[c.id]?.status === 'AVOID').length;
    const visitedAndRevisitCount = visited + revisit;
    const rate = total > 0 ? Math.round((visitedAndRevisitCount / total) * 1000) / 10 : 0;
    
    // Continent breakdown
    const continents: Record<string, { total: number; visited: number }> = {};
    COUNTRIES.forEach(c => {
      if (!continents[c.continent]) {
        continents[c.continent] = { total: 0, visited: 0 };
      }
      continents[c.continent].total++;
      if (places[c.id]?.status === 'VISITED' || places[c.id]?.status === 'REVISIT') {
        continents[c.continent].visited++;
      }
    });

    return { total, visited, wishlist, revisit, avoid, rate, continents };
  }, [places]);

  // Render detail panel (shared between desktop sidebar and mobile bottom sheet)
  const renderDetailPanel = () => {
    if (!selectedCountry) {
      // Statistics view
      return (
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-center gap-2 border-b border-base-300/50 pb-3">
            <Trophy size={16} className="text-primary" />
            <h3 className="font-bold text-sm text-base-content uppercase tracking-wider">Global Statistics</h3>
          </div>
          
          <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1 select-none">
            {/* Stats Card Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-base-200/30 border border-base-300/40 rounded-xl p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-base-content/40">Travel Coverage</span>
                <span className="text-lg font-extrabold text-primary mt-0.5">{stats.rate}%</span>
                <span className="text-[9px] text-base-content/50 mt-0.5">{stats.visited + stats.revisit} of {stats.total} countries</span>
              </div>
              <div className="bg-base-200/30 border border-base-300/40 rounded-xl p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-base-content/40">Wishlisted</span>
                <span className="text-lg font-extrabold text-accent-wishlist mt-0.5">{stats.wishlist}</span>
                <span className="text-[9px] text-base-content/50 mt-0.5">Places planned</span>
              </div>
              <div className="bg-base-200/30 border border-base-300/40 rounded-xl p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-base-content/40">Want to Revisit</span>
                <span className="text-lg font-extrabold text-accent-revisit mt-0.5">{stats.revisit}</span>
                <span className="text-[9px] text-base-content/50 mt-0.5">Return trips</span>
              </div>
              <div className="bg-base-200/30 border border-base-300/40 rounded-xl p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-base-content/40">Avoid List</span>
                <span className="text-lg font-extrabold text-accent-avoid mt-0.5">{stats.avoid}</span>
                <span className="text-[9px] text-base-content/50 mt-0.5">Not planning to go</span>
              </div>
            </div>

            {/* Continent progress bars */}
            <div className="flex flex-col gap-2.5 bg-base-200/10 border border-base-300/30 rounded-xl p-3 mt-1">
              <span className="text-[10px] uppercase font-bold text-base-content/40">Continent Coverage</span>
              <div className="flex flex-col gap-2 mt-1">
                {Object.entries(stats.continents).sort((a,b) => b[1].visited/b[1].total - a[1].visited/a[1].total).map(([continent, {total, visited}]) => {
                  const percent = total > 0 ? Math.round((visited / total) * 100) : 0;
                  return (
                    <div key={continent} className="flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between font-semibold text-base-content/80">
                        <span>{continent}</span>
                        <span>{visited}/{total} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-base-300/35 border border-base-300/20 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card bg-base-200/30 border border-base-300/40 p-3 rounded-xl flex items-center justify-center text-center mt-auto">
              <Globe className="text-base-content/20 mb-1.5" size={24} />
              <p className="text-[10px] text-base-content/50 leading-relaxed font-semibold">
                Click any country in the directory to explore its information and manage sub-regions.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const hasSubRegions = hasDrilldownSupport(selectedCountry.id);
    const countryStatus = places[selectedCountry.id]?.status || 'NONE';
    
    // Filter subregions
    const subregionsList = subRegionsByCountry[selectedCountry.id] || [];
    const filteredSubregions = subregionsList.filter(r => 
      fuzzyMatch(r.name, subRegionSearch)
    );

    return (
      <div className="flex flex-col gap-4 h-full overflow-hidden">
        {/* Title / Flag Header */}
        <div className="flex items-start justify-between border-b border-base-300/50 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedCountry.flag ? (
              <img 
                key={selectedCountry.flag} 
                src={selectedCountry.flag} 
                alt="" 
                className="w-7 h-5 object-cover rounded-sm border border-base-300/40 shrink-0" 
              />
            ) : (
              <div className="w-7 h-5 bg-base-300 rounded-sm shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <h3 className="font-extrabold text-sm text-base-content truncate leading-tight">{selectedCountry.name}</h3>
              <span className="text-[10px] opacity-50 font-mono tracking-wider">{selectedCountry.id} • {selectedCountry.continent}</span>
            </div>
          </div>
          <button 
            onClick={() => setSelectedCountryId(null)}
            className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content shrink-0"
            title="Close details"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable details content */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          
          {/* Status selection panel */}
          <div className="bg-base-200/35 border border-base-300/40 rounded-xl p-3 shrink-0 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Overall Travel Status</span>
            
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              {(['VISITED', 'WISHLIST', 'REVISIT', 'AVOID'] as const).map(mode => {
                const isActive = countryStatus === mode;
                const label = mode === 'VISITED' ? 'Visited' : mode === 'WISHLIST' ? 'Wishlist' : mode === 'REVISIT' ? 'Revisit' : 'Avoid';
                const activeColor = 
                  mode === 'VISITED' ? 'var(--accent-visited)' : 
                  mode === 'WISHLIST' ? 'var(--accent-wishlist)' : 
                  mode === 'REVISIT' ? 'var(--accent-revisit)' : 
                  'var(--accent-avoid)';

                return (
                  <button
                    key={mode}
                    onClick={() => handleStatusChange(selectedCountry.id, mode)}
                    className={`btn btn-outline btn-xs font-semibold gap-1.5 transition-all text-[11px] justify-start ${
                      isActive ? 'btn-active bg-primary/10' : 'text-base-content/75 border-base-300/30 hover:text-primary'
                    }`}
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

              {countryStatus !== 'NONE' && (
                <button
                  onClick={() => handleStatusChange(selectedCountry.id, 'NONE')}
                  className="btn btn-outline btn-xs btn-error text-[10px] font-bold col-span-2 mt-0.5 justify-center gap-1 bg-error/5 hover:bg-error/15 border-error/20"
                >
                  <RotateCcw size={11} /> Clear Country Status
                </button>
              )}
            </div>
          </div>

          {/* Sub-regions management container */}
          {hasSubRegions ? (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden bg-base-200/10 border border-base-300/35 rounded-xl p-3">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">
                  Sub-regions Explorer
                </span>
                
                {loadingSubRegions[selectedCountry.id] && (
                  <Loader2 size={11} className="animate-spin text-primary shrink-0" />
                )}
              </div>

              {loadingSubRegions[selectedCountry.id] ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-base-content/40">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <span>Loading region layout...</span>
                </div>
              ) : (
                <>
                  {/* Search inside subregions */}
                  <div className="relative w-full shrink-0 mt-0.5">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                      type="text"
                      className="input input-bordered input-xs !pl-7 w-full text-[11px] bg-base-200/50"
                      placeholder="Find region..."
                      value={subRegionSearch}
                      onChange={e => setSubRegionSearch(e.target.value)}
                    />
                    {subRegionSearch && (
                      <button 
                        onClick={() => setSubRegionSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  {/* Bulk Actions */}
                  <div className="grid grid-cols-2 gap-1.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => handleMarkAllVisited(selectedCountry.id)}
                      className="btn btn-neutral btn-xs text-[10px] font-semibold flex items-center justify-center gap-1 hover:text-accent-visited"
                    >
                      <Check size={11} /> Mark All Visited
                    </button>
                    <button
                      onClick={() => handleClearAllRegions(selectedCountry.id)}
                      className="btn btn-neutral btn-xs text-[10px] font-semibold flex items-center justify-center gap-1 hover:text-error"
                    >
                      <RotateCcw size={11} /> Clear All Regions
                    </button>
                  </div>

                  {/* Scrollable Subregions checklist */}
                  <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-1 pr-1 bg-base-300/10 border border-base-300/30 rounded-lg p-1.5">
                    {filteredSubregions.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-base-content/50 italic">
                        {subRegionSearch ? "No matching subregions." : "No subregions mapped."}
                      </div>
                    ) : (
                      filteredSubregions.map(state => {
                        const stateStatus = places[state.id]?.status || 'NONE';
                        const flagUrl = getPlaceFlagUrl(state.id);
                        
                        return (
                          <div 
                            key={state.id} 
                            className={`flex items-center justify-between p-3 px-3.5 rounded-xl border text-[12.5px] font-medium transition-all gap-2.5 ${
                              stateStatus === 'VISITED' ? 'bg-accent-visited/10 border-accent-visited/20 text-accent-visited font-bold' :
                              stateStatus === 'WISHLIST' ? 'bg-accent-wishlist/10 border-accent-wishlist/20 text-accent-wishlist font-bold' :
                              stateStatus === 'REVISIT' ? 'bg-accent-revisit/10 border-accent-revisit/20 text-accent-revisit font-bold' :
                              stateStatus === 'AVOID' ? 'bg-accent-avoid/10 border-accent-avoid/20 text-accent-avoid font-bold' :
                              'bg-base-200/30 border-transparent text-base-content/75 hover:bg-base-200/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className="cursor-pointer shrink-0"
                                title="Click flag to instantly toggle Visited status"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(state.id, 'VISITED');
                                }}
                              >
                                {flagUrl ? (
                                  <img
                                    src={flagUrl}
                                    alt=""
                                    className="w-7.5 h-5 object-cover rounded-sm border border-base-300/20"
                                    onError={(e) => {
                                      const parentFlag = getParentCountryFlagUrl(state.id);
                                      if (parentFlag && e.currentTarget.src !== parentFlag) {
                                        e.currentTarget.src = parentFlag;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-7.5 h-5 bg-base-300 rounded-sm border border-base-300/20" />
                                )}
                              </div>
                              <span className="truncate flex-1 font-bold">{state.name}</span>
                            </div>
                            
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => handleStatusChange(state.id, 'VISITED')}
                                className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 ${stateStatus === 'VISITED' ? 'btn-success text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-visited hover:bg-accent-visited/10'}`}
                                title="Visited"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(state.id, 'WISHLIST')}
                                className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 ${stateStatus === 'WISHLIST' ? 'btn-secondary text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-wishlist hover:bg-accent-wishlist/10'}`}
                                title="Wishlist"
                              >
                                <Heart size={13} fill={stateStatus === 'WISHLIST' ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(state.id, 'REVISIT')}
                                className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 ${stateStatus === 'REVISIT' ? 'btn-warning text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-revisit hover:bg-accent-revisit/10'}`}
                                title="Revisit"
                              >
                                <RotateCcw size={13} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(state.id, 'AVOID')}
                                className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 ${stateStatus === 'AVOID' ? 'btn-error text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-avoid hover:bg-accent-avoid/10'}`}
                                title="Avoid"
                              >
                                <Ban size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card bg-base-200/20 border border-base-300/40 p-4 rounded-xl flex-1 flex flex-col items-center justify-center text-center text-xs text-base-content/40 select-none">
              <Layers size={22} className="opacity-30 mb-1" />
              <span>Offline country mapping matches continent levels. No maps or sub-regions available for regional tracking.</span>
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4 overflow-hidden bg-transparent select-none max-w-6xl mx-auto w-full">
      {/* Search and Filters Header */}
      <div className="glass-panel border border-base-300/50 p-4.5 rounded-2xl shrink-0 flex flex-col gap-3.5 items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center gap-1 shrink-0 select-none">
          <h2 className="flex items-center gap-2 text-md font-extrabold text-base-content justify-center">
            <Filter size={16} className="text-primary animate-pulse" />
            Country Directory
          </h2>
          <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-wider">
            Showing {filteredCountries.length} of {COUNTRIES.length} countries
          </span>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-3.5 items-center justify-center w-full mt-0.5">
          {/* Global search & Sub-regions check wrapper */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full lg:w-auto">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input 
                type="text" 
                className="input input-bordered input-sm !pl-8 w-full text-xs" 
                placeholder="Search countries..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Include sub-regions toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-base-content/70 select-none shrink-0 py-1">
              <input 
                type="checkbox" 
                className="checkbox checkbox-primary checkbox-xs"
                checked={searchSubRegions} 
                onChange={(e) => setSearchSubRegions(e.target.checked)} 
              />
              <span>Include Sub-regions</span>
            </label>
          </div>
          
          {/* Divider on desktop */}
          <div className="hidden lg:block w-px h-6 bg-base-300/40" />
          
          {/* Global filter tabs */}
          <div className="flex flex-wrap gap-1 justify-center items-center w-full lg:w-auto">
            {(['ALL', 'VISITED', 'WISHLIST', 'REVISIT', 'AVOID', 'UNSELECTED'] as const).map((mode) => (
              <button
                key={mode}
                className={`btn btn-xs font-semibold ${filterMode === mode ? 'btn-primary' : 'btn-outline border-base-300/40 text-base-content/85 hover:text-primary'}`}
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

      {/* Main Split Directory Area */}
      <div className="flex-1 flex flex-row gap-6 overflow-hidden h-full">
        
        {/* Left Side: Directory Scrollable List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 h-full">
          {Object.keys(groupedPlaces).length === 0 ? (
            <div className="text-center py-12 text-sm text-base-content/40 select-none border border-dashed border-base-300/45 rounded-2xl bg-base-200/5">
              No countries found matching your criteria.
            </div>
          ) : (
            Object.entries(groupedPlaces).map(([continent, placesInContinent]) => {
              const isCollapsed = collapsedContinents[continent];
              
              return (
                <div key={continent} className="flex flex-col shrink-0">
                  <h3 
                    onClick={() => toggleContinent(continent)}
                    className="flex items-center gap-1.5 font-bold text-xs text-base-content/80 border-b border-base-300/35 pb-1.5 mt-2 mb-2 cursor-pointer uppercase tracking-wider select-none hover:text-primary transition-colors"
                  >
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span>{continent}</span>
                    <span className="text-[10px] opacity-40 font-semibold font-mono">({placesInContinent.length})</span>
                  </h3>
                  
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2.5">
                      {placesInContinent.map(country => {
                        const status = places[country.id]?.status || 'NONE';
                        const isSelected = selectedCountryId === country.id;
                        const hasDrill = hasDrilldownSupport(country.id);                        return (
                          <div 
                            key={country.id} 
                            onClick={() => {
                              setSelectedCountryId(country.id);
                              setSubRegionSearch('');
                            }}
                            className={getCardBorderAndBg(status, isSelected)}
                          >
                            {/* Top Row: Identity (Flag, Name, Code) */}
                            <div className="flex items-center gap-3 w-full min-w-0">
                              <div 
                                className="cursor-pointer shrink-0 hover:scale-105 transition-transform"
                                title="Click flag to instantly toggle Visited status"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(country.id, 'VISITED');
                                }}
                              >
                                {country.flag ? (
                                  <img src={country.flag} alt="" className="w-9 h-6 object-cover rounded-sm border border-base-300/20" />
                                ) : (
                                  <div className="w-9 h-6 bg-base-300 rounded-sm border border-base-300/20" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate font-extrabold text-[14px] leading-tight text-base-content" title={country.name}>{country.name}</span>
                                <span className="text-[10px] opacity-40 font-mono tracking-wider font-semibold uppercase">{country.id}</span>
                              </div>
                            </div>

                            {/* Bottom Row: Progress (left) & Actions (right) */}
                            <div className="flex items-center justify-between w-full pt-2.5 border-t border-base-300/10 gap-2" onClick={e => e.stopPropagation()}>
                              {hasDrill ? (
                                <div className="flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary rounded px-2.5 py-1 text-[10px] font-bold shrink-0 select-none">
                                  <Map size={10} />
                                  <span>{getSubregionsProgressString(country.id)}</span>
                                </div>
                              ) : (
                                <div className="flex-1" />
                              )}
                              
                              <div className="flex gap-1.5 shrink-0">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'VISITED');
                                  }}
                                  title="Visited"
                                  className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 transition-all ${status === 'VISITED' ? 'btn-success text-white border-none shadow-sm' : 'btn-ghost text-base-content/30 hover:text-accent-visited hover:bg-accent-visited/10'}`}
                                >
                                  <Check size={13} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'WISHLIST');
                                  }}
                                  title="Wishlist"
                                  className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 transition-all ${status === 'WISHLIST' ? 'btn-secondary text-white border-none shadow-sm' : 'btn-ghost text-base-content/30 hover:text-accent-wishlist hover:bg-accent-wishlist/10'}`}
                                >
                                  <Heart size={13} fill={status === 'WISHLIST' ? 'currentColor' : 'none'} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'REVISIT');
                                  }}
                                  title="Revisit"
                                  className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 transition-all ${status === 'REVISIT' ? 'btn-warning text-white border-none shadow-sm' : 'btn-ghost text-base-content/30 hover:text-accent-revisit hover:bg-accent-revisit/10'}`}
                                >
                                  <RotateCcw size={13} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'AVOID');
                                  }}
                                  title="Avoid"
                                  className={`btn btn-square btn-circle btn-sm h-7.5 w-7.5 transition-all ${status === 'AVOID' ? 'btn-error text-white border-none shadow-sm' : 'btn-ghost text-base-content/30 hover:text-accent-avoid hover:bg-accent-avoid/10'}`}
                                >
                                  <Ban size={13} />
                                </button>
                              </div>
                            </div>
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

        {/* Right Side: Desktop Sidebar Details Card */}
        <div className="hidden lg:flex lg:w-96 shrink-0 h-full overflow-hidden flex-col">
          <div className="glass-panel border border-base-300/50 p-4 rounded-2xl h-full flex flex-col overflow-hidden bg-base-200/10">
            {renderDetailPanel()}
          </div>
        </div>

      </div>

      {/* Mobile Details Drawer overlay modal */}
      {selectedCountry && (
        <div 
          className="fixed inset-0 lg:hidden bg-black/60 backdrop-blur-sm z-50 transition-opacity flex items-end justify-center animate-fadeIn"
          onClick={() => setSelectedCountryId(null)}
        >
          <div 
            className="w-full max-h-[80vh] glass-panel bg-base-100 rounded-t-3xl border-t border-base-300 p-5 overflow-hidden flex flex-col gap-4 shadow-2xl animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle Bar Indicator */}
            <div className="w-12 h-1 bg-base-300/60 rounded-full mx-auto shrink-0 mb-1" />
            
            <div className="flex-1 overflow-y-auto pr-1">
              {renderDetailPanel()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
