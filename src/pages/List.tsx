import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { COUNTRIES } from '../data/countries';
import type { Country } from '../data/countries';
import { useStore } from '../store/useStore';
import type { PlaceStatus } from '../store/useStore';
import { 
  Search, 
  Check, 
  Heart, 
  ChevronDown, 
  ChevronRight, 
  Ban, 
  RotateCcw, 
  X, 
  Map, 
  ArrowUpAZ,
  ArrowDownAZ,
  ListOrdered
} from 'lucide-react';
import { fetchSubRegions, hasDrilldownSupport } from '../utils/topojsonCache';
import type { TopoRegion } from '../utils/topojsonCache';
import { ListDetailPanel } from '../components/list/ListDetailPanel';
import { preloadPlaceFlags } from '../utils/flagUtils';
import { fuzzyMatch, matchCountry } from '../utils/searchUtils';
import { loadSubRegionSearchIndex } from '../utils/subRegionSearchIndex';

const CONTINENTS: { name: string; shortName: string }[] = [
  { name: 'Africa', shortName: 'Africa' },
  { name: 'Asia', shortName: 'Asia' },
  { name: 'Europe', shortName: 'Europe' },
  { name: 'North America', shortName: 'N. America' },
  { name: 'Oceania', shortName: 'Oceania' },
  { name: 'South America', shortName: 'S. America' },
];

// Sort mode types
type SortMode = 'A-Z' | 'Z-A' | 'STATUS';

// Status filter type
type StatusFilter = 'ALL' | 'VISITED' | 'WISHLIST' | 'REVISIT' | 'AVOID' | 'UNSELECTED';

// Status priority for "Status First" sorting
const STATUS_PRIORITY: Record<string, number> = {
  VISITED: 0,
  WISHLIST: 1,
  REVISIT: 2,
  AVOID: 3,
  NONE: 4,
};

// Status display config
const STATUS_CONFIG: { status: StatusFilter; label: string; dot: boolean }[] = [
  { status: 'ALL', label: 'All', dot: false },
  { status: 'VISITED', label: 'Visited', dot: true },
  { status: 'WISHLIST', label: 'Wishlist', dot: true },
  { status: 'REVISIT', label: 'Revisit', dot: true },
  { status: 'AVOID', label: 'Avoid', dot: true },
  { status: 'UNSELECTED', label: 'Unselected', dot: false },
];

// Status badge config for cards
const BADGE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  VISITED: { label: 'Visited', icon: <Check size={9} /> },
  WISHLIST: { label: 'Wishlist', icon: <Heart size={9} fill="currentColor" /> },
  REVISIT: { label: 'Revisit', icon: <RotateCcw size={9} /> },
  AVOID: { label: 'Avoid', icon: <Ban size={9} /> },
};

// Status group labels for "Status First" grouping
const STATUS_GROUP_LABELS: Record<string, string> = {
  VISITED: 'Visited',
  WISHLIST: 'Wishlist',
  REVISIT: 'Want to Revisit',
  AVOID: 'Avoid',
  NONE: 'Unselected',
};

const List: React.FC = () => {
  const { places, setCountryStatus } = useStore();
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [searchSubRegions, setSearchSubRegions] = useState(false);
  const [isRegionIndexLoading, setIsRegionIndexLoading] = useState(false);
  const [isRegionIndexReady, setIsRegionIndexReady] = useState(false);
  const [filterMode, setFilterMode] = useState<StatusFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('A-Z');
  const [continentFilter, setContinentFilter] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Sub-region loading & selection
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [subRegionSearch, setSubRegionSearch] = useState('');
  const [subRegionFilter, setSubRegionFilter] = useState<StatusFilter>('ALL');
  const [subRegionsByCountry, setSubRegionsByCountry] = useState<Record<string, TopoRegion[]>>({});
  const [loadingSubRegions, setLoadingSubRegions] = useState<Record<string, boolean>>({});

  const selectCountry = useCallback((id: string | null) => {
    setSelectedCountryId(id);
    setSubRegionSearch('');
    setSubRegionFilter('ALL');
  }, []);

  // Fetch subregions helper
  const loadSubRegions = useCallback(async (id: string) => {
    if (subRegionsByCountry[id] || loadingSubRegions[id]) return;
    setLoadingSubRegions(prev => ({ ...prev, [id]: true }));
    const regions = await fetchSubRegions(id);
    setSubRegionsByCountry(prev => ({ ...prev, [id]: regions }));
    setLoadingSubRegions(prev => ({ ...prev, [id]: false }));
  }, [subRegionsByCountry, loadingSubRegions]);

  // Region search is optional: do not load global subdivisions for a blank query.
  useEffect(() => {
    if (!searchSubRegions || !deferredSearch.trim() || isRegionIndexReady) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setIsRegionIndexLoading(true);
      return loadSubRegionSearchIndex();
    }).then((index) => {
      if (active) {
        setSubRegionsByCountry((current) => ({ ...current, ...index }));
        setIsRegionIndexReady(true);
      }
    }).catch((error: unknown) => {
      console.warn('Could not build sub-region search index', error);
    }).finally(() => {
      if (active) setIsRegionIndexLoading(false);
    });
    return () => { active = false; };
  }, [searchSubRegions, deferredSearch, isRegionIndexReady]);

  // Trigger sub-regions load when a country with sub-regions is selected
  useEffect(() => {
    if (selectedCountryId && hasDrilldownSupport(selectedCountryId)) {
      Promise.resolve().then(async () => {
        await loadSubRegions(selectedCountryId);
      });
    }
  }, [selectedCountryId, loadSubRegions, subRegionsByCountry]);

  useEffect(() => {
    if (!selectedCountryId) return;
    const regions = subRegionsByCountry[selectedCountryId];
    if (!regions) return;
    return preloadPlaceFlags(regions.map((region) => region.id));
  }, [selectedCountryId, subRegionsByCountry]);



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

  // Compute status counts for sub-regions of selected country
  const subRegionCounts = useMemo(() => {
    const counts = { ALL: 0, VISITED: 0, WISHLIST: 0, REVISIT: 0, AVOID: 0, UNSELECTED: 0 };
    if (!selectedCountry) return counts;
    const list = subRegionsByCountry[selectedCountry.id] || [];
    counts.ALL = list.length;
    list.forEach((r) => {
      let status = places[selectedCountry.id]?.regions?.[r.id];
      if (status === undefined) status = places[r.id]?.status || 'NONE';

      if (status === 'VISITED') counts.VISITED++;
      else if (status === 'WISHLIST') counts.WISHLIST++;
      else if (status === 'REVISIT') counts.REVISIT++;
      else if (status === 'AVOID') counts.AVOID++;
      else counts.UNSELECTED++;
    });
    return counts;
  }, [selectedCountry, subRegionsByCountry, places]);

  // Toggle continent filter
  const toggleContinent = (continent: string) => {
    setContinentFilter(prev => {
      const next = new Set(prev);
      if (next.has(continent)) {
        next.delete(continent);
      } else {
        next.add(continent);
      }
      return next;
    });
  };

  // Cycle sort mode
  const cycleSortMode = () => {
    setSortMode(prev => {
      if (prev === 'A-Z') return 'Z-A';
      if (prev === 'Z-A') return 'STATUS';
      return 'A-Z';
    });
  };

  // Overall Statistics
  const stats = useMemo(() => {
    const total = COUNTRIES.length;
    const visited = COUNTRIES.filter(c => places[c.id]?.status === 'VISITED').length;
    const wishlist = COUNTRIES.filter(c => places[c.id]?.status === 'WISHLIST').length;
    const revisit = COUNTRIES.filter(c => places[c.id]?.status === 'REVISIT').length;
    const avoid = COUNTRIES.filter(c => places[c.id]?.status === 'AVOID').length;
    const unselected = total - visited - wishlist - revisit - avoid;
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

    return { total, visited, wishlist, revisit, avoid, unselected, rate, continents };
  }, [places]);

  // Status counts for filter pills
  const statusCounts = useMemo(() => ({
    ALL: COUNTRIES.length,
    VISITED: stats.visited,
    WISHLIST: stats.wishlist,
    REVISIT: stats.revisit,
    AVOID: stats.avoid,
    UNSELECTED: stats.unselected,
  }), [stats]);

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

      const matchesContinent = continentFilter.size === 0 || continentFilter.has(c.continent);
        
      return matchesSearch && matchesFilter && matchesContinent;
    });
  }, [places, deferredSearch, filterMode, searchSubRegions, subRegionsByCountry, continentFilter]);

  // Sort countries
  const sortedCountries = useMemo(() => {
    const sorted = [...filteredCountries];
    if (sortMode === 'A-Z') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'Z-A') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // Status first: group by status priority, then A-Z within
      sorted.sort((a, b) => {
        const statusA = places[a.id]?.status || 'NONE';
        const statusB = places[b.id]?.status || 'NONE';
        const priorityDiff = STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB];
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name);
      });
    }
    return sorted;
  }, [filteredCountries, sortMode, places]);

  // Group countries by continent or status
  const groupedPlaces = useMemo(() => {
    const groups: Record<string, Country[]> = {};

    if (sortMode === 'STATUS') {
      // Group by status
      sortedCountries.forEach(country => {
        const status = places[country.id]?.status || 'NONE';
        const groupLabel = STATUS_GROUP_LABELS[status] || 'Unselected';
        if (!groups[groupLabel]) groups[groupLabel] = [];
        groups[groupLabel].push(country);
      });
      // Return in status priority order
      const orderedGroups: Record<string, Country[]> = {};
      for (const statusLabel of Object.values(STATUS_GROUP_LABELS)) {
        if (groups[statusLabel]) {
          orderedGroups[statusLabel] = groups[statusLabel];
        }
      }
      return orderedGroups;
    } else {
      // Group by continent
      sortedCountries.forEach(country => {
        if (!groups[country.continent]) groups[country.continent] = [];
        groups[country.continent].push(country);
      });
      // Sort continents alphabetically
      return Object.keys(groups).sort().reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as Record<string, Country[]>);
    }
  }, [sortedCountries, sortMode, places]);

  // Toggle group section
  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Count visited subregions dynamically
  const getSubregionsProgressString = useCallback((countryId: string) => {
    const visited = Object.keys(places).filter(k => k.startsWith(`${countryId}-`) && (places[k]?.status === 'VISITED' || places[k]?.status === 'REVISIT')).length;
    const regions = subRegionsByCountry[countryId];
    if (regions && regions.length > 0) {
      return `${visited}/${regions.length}`;
    }
    return visited > 0 ? `${visited}` : 'Map';
  }, [places, subRegionsByCountry]);

  // Sort mode icon and label
  const sortModeDisplay = {
    'A-Z': { icon: <ArrowUpAZ size={13} />, label: 'A → Z' },
    'Z-A': { icon: <ArrowDownAZ size={13} />, label: 'Z → A' },
    'STATUS': { icon: <ListOrdered size={13} />, label: 'Status' },
  };

  // Render detail panel (shared between desktop sidebar and mobile bottom sheet)
  const renderDetailPanel = () => (
    <ListDetailPanel
      selectedCountry={selectedCountry}
      stats={stats}
      places={places}
      subRegionsByCountry={subRegionsByCountry}
      loadingSubRegions={loadingSubRegions}
      subRegionSearch={subRegionSearch}
      setSubRegionSearch={setSubRegionSearch}
      subRegionFilter={subRegionFilter}
      setSubRegionFilter={setSubRegionFilter}
      subRegionCounts={subRegionCounts}
      selectCountry={selectCountry}
      handleStatusChange={handleStatusChange}
      handleMarkAllVisited={handleMarkAllVisited}
      handleClearAllRegions={handleClearAllRegions}
    />
  );

  const activeFilterLabels = [
    ...Array.from(continentFilter).sort(),
    ...(filterMode === 'ALL' ? [] : [STATUS_CONFIG.find(({ status }) => status === filterMode)?.label ?? filterMode]),
    ...(search.trim() ? [`“${search.trim()}”`] : []),
  ];
  const hasActiveFilters = activeFilterLabels.length > 0;

  return (
    <div className="survey-page survey-list p-4 md:p-6 h-full flex flex-col gap-4 overflow-hidden bg-transparent select-none max-w-6xl mx-auto w-full">
      {/* Toolbar Header */}
      <div className="survey-list__toolbar shrink-0">
        <div className="survey-list__heading">
          <div>
            <h1>Places</h1>
            <p>Find a country and mark where you have been or want to go.</p>
          </div>
        </div>
        
        <div className="survey-list__controls">
          <div className="survey-list__search">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input 
              type="text" 
              className="input input-bordered input-sm !pl-8 w-full text-xs" 
              placeholder="Search countries..." 
              aria-label="Search countries"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="survey-list__search-clear"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          
          <label className="survey-list__subregions-toggle">
            <input 
              type="checkbox" 
              className="survey-checkbox"
              checked={searchSubRegions} 
              onChange={(e) => setSearchSubRegions(e.target.checked)} 
            />
            <span>Sub-regions</span>
          </label>

          <button 
            className="list-sort-btn"
            onClick={cycleSortMode}
            title={`Sort: ${sortMode}`}
            aria-label={`Sort by ${sortModeDisplay[sortMode].label}. Change sort order`}
          >
            {sortModeDisplay[sortMode].icon}
            <span>{sortModeDisplay[sortMode].label}</span>
          </button>
        </div>

        <div className="survey-list__filters">
        <div className="survey-list__filter-group" role="group" aria-label="Filter by continent">
        <span className="survey-list__filter-label">Continent</span>
        <div className="list-continent-chips">
          <button
            className={`list-continent-chip ${continentFilter.size === 0 ? 'list-continent-chip--active' : ''}`}
            onClick={() => setContinentFilter(new Set())}
            aria-pressed={continentFilter.size === 0}
          >
            <span>All</span>
          </button>
          {CONTINENTS.map(c => (
            <button
              key={c.name}
              className={`list-continent-chip ${continentFilter.has(c.name) ? 'list-continent-chip--active' : ''}`}
              onClick={() => toggleContinent(c.name)}
              aria-pressed={continentFilter.has(c.name)}
            >
              <span>{c.shortName}</span>
            </button>
          ))}
        </div>
        </div>

        <div className="survey-list__filter-group" role="group" aria-label="Filter by status">
        <span className="survey-list__filter-label">Status</span>
        <div className="list-status-pills">
          {STATUS_CONFIG.map(({ status, label, dot }) => (
            <button
              key={status}
              className={`list-status-pill list-status-pill--${status.toLowerCase()}${filterMode === status ? ' list-status-pill--active' : ''}`}
              onClick={() => setFilterMode(status)}
              aria-pressed={filterMode === status}
            >
              {dot && <span className="list-status-pill__dot" />}
              <span>{label}</span>
              <span className="list-status-pill__count">{statusCounts[status]}</span>
            </button>
          ))}
        </div>
        </div>
        </div>

        {/* Summary line */}
        <div className={`survey-list__filter-summary${hasActiveFilters ? ' survey-list__filter-summary--active' : ''}`} aria-live="polite">
          <span className="survey-list__filter-count">{isRegionIndexLoading && searchSubRegions && deferredSearch.trim() ? 'Indexing sub-regions…' : `Showing ${filteredCountries.length} of ${COUNTRIES.length} countries`}</span>
          {hasActiveFilters && (
            <>
              <span className="survey-list__filter-description">Filtered by <strong>{activeFilterLabels.join(' · ')}</strong></span>
              <button type="button" className="survey-list__clear-filters" onClick={() => { setContinentFilter(new Set()); setFilterMode('ALL'); setSearch(''); }}>
                Clear filters <X size={13} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split Directory Area */}
      <div className="survey-list__main flex-1 flex flex-row gap-6 overflow-hidden h-full">
        
        {/* Left Side: Directory Scrollable List */}
        <div className="survey-list__directory flex-1 overflow-y-auto pr-1 flex flex-col gap-4 h-full">
          {Object.keys(groupedPlaces).length === 0 ? (
            <div className="text-center py-12 text-sm text-base-content/40 select-none border border-dashed border-base-300/45 rounded-2xl bg-base-200/5">
              No countries found matching your criteria.
            </div>
          ) : (
            Object.entries(groupedPlaces).map(([group, countriesInGroup]) => {
              const isCollapsed = collapsedGroups[group];
              
              return (
                <div key={group} className="flex flex-col shrink-0">
                  <h3 
                    onClick={() => toggleGroup(group)}
                    className="flex items-center gap-1.5 font-bold text-xs text-base-content/80 border-b border-base-300/35 pb-1.5 mt-2 mb-2 cursor-pointer uppercase tracking-wider select-none hover:text-primary transition-colors"
                  >
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span>{group}</span>
                    <span className="text-[10px] opacity-40 font-semibold font-mono">({countriesInGroup.length})</span>
                  </h3>
                  
                  {!isCollapsed && (
                    <div className="survey-list__country-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-1">
                      {countriesInGroup.map(country => {
                        const status = places[country.id]?.status || 'NONE';
                        const isSelected = selectedCountryId === country.id;
                        const hasDrill = hasDrilldownSupport(country.id);
                        const badge = BADGE_CONFIG[status];

                        return (
                          <div 
                            key={country.id} 
                            onClick={() => selectCountry(country.id)}
                            className={`list-country-card list-country-card--${status.toLowerCase()}${isSelected ? ' list-country-card--selected' : ''}`}
                          >
                            {/* Main row: Flag + Name + Status badge */}
                            <div className="list-country-card__main">
                              {country.flag && (
                                <img src={country.flag} alt="" loading="lazy" decoding="async" className="list-country-card__flag" />
                              )}
                              <div className="list-country-card__info">
                                <span className="list-country-card__name" title={country.name}>{country.name}</span>
                                <span className="list-country-card__meta">{country.id} • {country.continent}</span>
                              </div>
                              {badge && (
                                <div className="list-country-card__status-badge">
                                  {badge.icon}
                                  <span>{badge.label}</span>
                                </div>
                              )}
                            </div>

                            {/* Bottom row: Sub-region badge + Action buttons */}
                            <div className="list-country-card__actions" onClick={e => e.stopPropagation()}>
                              {hasDrill ? (
                                <div 
                                  className="list-country-card__subregion-badge"
                                  title="Click to view sub-regions"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectCountry(country.id);
                                  }}
                                >
                                  <Map size={10} />
                                  <span>{getSubregionsProgressString(country.id)}</span>
                                </div>
                              ) : (
                                <div className="flex-1" />
                              )}
                              
                              <div className="flex gap-1 shrink-0">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'VISITED');
                                  }}
                                  title="Visited"
                                  className={`list-country-card__action-btn list-country-card__action-btn--visited ${status === 'VISITED' ? 'list-country-card__action-btn--active' : ''}`}
                                >
                                  <Check size={13} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'WISHLIST');
                                  }}
                                  title="Wishlist"
                                  className={`list-country-card__action-btn list-country-card__action-btn--wishlist ${status === 'WISHLIST' ? 'list-country-card__action-btn--active' : ''}`}
                                >
                                  <Heart size={13} fill={status === 'WISHLIST' ? 'currentColor' : 'none'} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'REVISIT');
                                  }}
                                  title="Revisit"
                                  className={`list-country-card__action-btn list-country-card__action-btn--revisit ${status === 'REVISIT' ? 'list-country-card__action-btn--active' : ''}`}
                                >
                                  <RotateCcw size={13} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(country.id, 'AVOID');
                                  }}
                                  title="Avoid"
                                  className={`list-country-card__action-btn list-country-card__action-btn--avoid ${status === 'AVOID' ? 'list-country-card__action-btn--active' : ''}`}
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
        <div className="survey-list__sidebar hidden lg:flex lg:w-96 shrink-0 h-full overflow-hidden flex-col">
          <div className="glass-panel border border-base-300/50 p-4 rounded-2xl h-full flex flex-col overflow-hidden bg-base-200/10">
            {renderDetailPanel()}
          </div>
        </div>

      </div>

      {/* Mobile Details Drawer overlay modal */}
      {selectedCountry && (
        <div 
          className="fixed inset-0 lg:hidden bg-black/60 backdrop-blur-sm z-50 transition-opacity flex items-end justify-center animate-fadeIn"
          onClick={() => selectCountry(null)}
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
