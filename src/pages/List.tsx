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
  Loader2, 
  X, 
  Map, 
  Layers, 
  Trophy,
  Globe,
  ArrowUpAZ,
  ArrowDownAZ,
  ListOrdered
} from 'lucide-react';
import { fetchSubRegions, hasDrilldownSupport } from '../utils/topojsonCache';
import type { TopoRegion } from '../utils/topojsonCache';
import { FlagImage } from '../components/common/FlagImage';
import { preloadPlaceFlags } from '../utils/flagUtils';
import { fuzzyMatch, matchCountry } from '../utils/searchUtils';

// Continent metadata with emoji icons
const CONTINENTS: { name: string; emoji: string; shortName: string }[] = [
  { name: 'Africa', emoji: '🌍', shortName: 'Africa' },
  { name: 'Asia', emoji: '🌏', shortName: 'Asia' },
  { name: 'Europe', emoji: '🏰', shortName: 'Europe' },
  { name: 'North America', emoji: '🌎', shortName: 'N. America' },
  { name: 'Oceania', emoji: '🌊', shortName: 'Oceania' },
  { name: 'South America', emoji: '🌎', shortName: 'S. America' },
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
const STATUS_CONFIG: { status: StatusFilter; label: string; colorVar: string; dot: boolean }[] = [
  { status: 'ALL', label: 'All', colorVar: 'var(--accent-primary)', dot: false },
  { status: 'VISITED', label: 'Visited', colorVar: 'var(--accent-visited)', dot: true },
  { status: 'WISHLIST', label: 'Wishlist', colorVar: 'var(--accent-wishlist)', dot: true },
  { status: 'REVISIT', label: 'Revisit', colorVar: 'var(--accent-revisit)', dot: true },
  { status: 'AVOID', label: 'Avoid', colorVar: 'var(--accent-avoid)', dot: true },
  { status: 'UNSELECTED', label: 'Unselected', colorVar: 'var(--text-secondary)', dot: false },
];

// Status badge config for cards
const BADGE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  VISITED: { label: 'Visited', icon: <Check size={9} />, color: 'var(--accent-visited)' },
  WISHLIST: { label: 'Wishlist', icon: <Heart size={9} fill="currentColor" />, color: 'var(--accent-wishlist)' },
  REVISIT: { label: 'Revisit', icon: <RotateCcw size={9} />, color: 'var(--accent-revisit)' },
  AVOID: { label: 'Avoid', icon: <Ban size={9} />, color: 'var(--accent-avoid)' },
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
  const { places, setCountryStatus, neDataLoaded } = useStore();
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [searchSubRegions, setSearchSubRegions] = useState(false);
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

  // When sub-region search is enabled, bulk-load sub-regions for every country.
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
      Promise.resolve().then(async () => {
        await loadSubRegions(selectedCountryId);
        const subRegs = subRegionsByCountry[selectedCountryId];
        if (subRegs) {
          preloadPlaceFlags(subRegs.map(r => r.id));
        }
      });
    }
  }, [selectedCountryId, loadSubRegions, subRegionsByCountry]);



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
    const isCurated = countryId === 'USA' || countryId === 'GBR';
    if (!neDataLoaded && !isCurated && !subRegionsByCountry[countryId]) {
      return '...';
    }
    const visited = Object.keys(places).filter(k => k.startsWith(`${countryId}-`) && (places[k]?.status === 'VISITED' || places[k]?.status === 'REVISIT')).length;
    const regions = subRegionsByCountry[countryId];
    if (regions && regions.length > 0) {
      return `${visited}/${regions.length}`;
    }
    return visited > 0 ? `${visited}` : 'Map';
  }, [places, subRegionsByCountry, neDataLoaded]);

  // Get accent color for a status
  const getAccentColor = (status: PlaceStatus): string => {
    switch (status) {
      case 'VISITED': return 'var(--accent-visited)';
      case 'WISHLIST': return 'var(--accent-wishlist)';
      case 'REVISIT': return 'var(--accent-revisit)';
      case 'AVOID': return 'var(--accent-avoid)';
      default: return 'transparent';
    }
  };

  // Sort mode icon and label
  const sortModeDisplay = {
    'A-Z': { icon: <ArrowUpAZ size={13} />, label: 'A → Z' },
    'Z-A': { icon: <ArrowDownAZ size={13} />, label: 'Z → A' },
    'STATUS': { icon: <ListOrdered size={13} />, label: 'Status' },
  };

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
    const filteredSubregions = subregionsList.filter(r => {
      const matchesSearch = fuzzyMatch(r.name, subRegionSearch);
      const stateStatus = places[r.id]?.status || 'NONE';
      const matchesFilter = 
        subRegionFilter === 'ALL' ? true :
        subRegionFilter === 'UNSELECTED' ? stateStatus === 'NONE' :
        stateStatus === subRegionFilter;
      return matchesSearch && matchesFilter;
    });

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
            onClick={() => selectCountry(null)}
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

                  {/* Status filter for subregions */}
                  <div className="flex gap-1 overflow-x-auto py-1 shrink-0 select-none no-scrollbar">
                    {(['ALL', 'VISITED', 'WISHLIST', 'REVISIT', 'AVOID', 'UNSELECTED'] as const).map((mode) => {
                      const isActive = subRegionFilter === mode;
                      const activeColor = 
                        mode === 'VISITED' ? 'var(--accent-visited)' : 
                        mode === 'WISHLIST' ? 'var(--accent-wishlist)' : 
                        mode === 'REVISIT' ? 'var(--accent-revisit)' : 
                        mode === 'AVOID' ? 'var(--accent-avoid)' : 
                        mode === 'UNSELECTED' ? 'var(--text-secondary)' :
                        'var(--accent-primary)';
                        
                      return (
                        <button
                          key={mode}
                          onClick={() => setSubRegionFilter(mode)}
                          className={`btn btn-xs rounded-full font-bold px-2 py-0.5 text-[9px] transition-all flex items-center gap-1 shrink-0 ${
                            isActive ? 'btn-active' : 'btn-outline border-base-300/30 text-base-content/60'
                          }`}
                          style={{
                            borderColor: isActive ? activeColor : undefined,
                            color: isActive ? activeColor : undefined,
                            background: isActive ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : undefined
                          }}
                          title={`Show ${mode.toLowerCase()} sub-regions`}
                        >
                          {mode === 'VISITED' && <Check size={8} />}
                          {mode === 'WISHLIST' && <Heart size={8} fill="currentColor" />}
                          {mode === 'REVISIT' && <RotateCcw size={8} />}
                          {mode === 'AVOID' && <Ban size={8} />}
                          <span>
                            {mode === 'ALL' ? 'All' : 
                             mode === 'UNSELECTED' ? 'Unselected' : 
                             mode.charAt(0) + mode.slice(1).toLowerCase()}
                          </span>
                        </button>
                      );
                    })}
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
                                <FlagImage
                                  placeId={state.id}
                                  className="w-7.5 h-5 object-cover rounded-sm border border-base-300/20"
                                />
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
      {/* Toolbar Header */}
      <div className="glass-panel border border-base-300/50 p-4 rounded-2xl shrink-0 flex flex-col gap-3">
        
        {/* Row 1: Search + Sort + Sub-region toggle */}
        <div className="flex items-center justify-center gap-3 w-full">
          <div className="relative w-full sm:max-w-xs">
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
          <label className="hidden sm:flex items-center gap-2 cursor-pointer text-xs text-base-content/70 select-none shrink-0 py-1">
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary checkbox-xs"
              checked={searchSubRegions} 
              onChange={(e) => setSearchSubRegions(e.target.checked)} 
            />
            <span>Sub-regions</span>
          </label>

          {/* Sort button */}
          <button 
            className="list-sort-btn"
            onClick={cycleSortMode}
            title={`Sort: ${sortMode}`}
          >
            {sortModeDisplay[sortMode].icon}
            <span className="hidden sm:inline">{sortModeDisplay[sortMode].label}</span>
          </button>
        </div>

        {/* Row 2: Continent Quick Filters */}
        <div className="list-continent-chips">
          <button
            className={`list-continent-chip ${continentFilter.size === 0 ? 'list-continent-chip--active' : ''}`}
            onClick={() => setContinentFilter(new Set())}
          >
            <span className="list-continent-chip__emoji">🌐</span>
            <span>All</span>
          </button>
          {CONTINENTS.map(c => (
            <button
              key={c.name}
              className={`list-continent-chip ${continentFilter.has(c.name) ? 'list-continent-chip--active' : ''}`}
              onClick={() => toggleContinent(c.name)}
            >
              <span className="list-continent-chip__emoji">{c.emoji}</span>
              <span>{c.shortName}</span>
            </button>
          ))}
        </div>

        {/* Row 3: Status Filter Pills */}
        <div className="list-status-pills">
          {STATUS_CONFIG.map(({ status, label, colorVar, dot }) => (
            <button
              key={status}
              className={`list-status-pill ${filterMode === status ? 'list-status-pill--active' : ''}`}
              style={{ '--pill-color': colorVar } as React.CSSProperties}
              onClick={() => setFilterMode(status)}
            >
              {dot && <span className="list-status-pill__dot" />}
              <span>{label}</span>
              <span className="list-status-pill__count">{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        {/* Summary line */}
        <div className="text-center">
          <span className="text-[10px] text-base-content/40 font-bold uppercase tracking-wider">
            Showing {filteredCountries.length} of {COUNTRIES.length} countries
          </span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-1">
                      {countriesInGroup.map(country => {
                        const status = places[country.id]?.status || 'NONE';
                        const isSelected = selectedCountryId === country.id;
                        const hasDrill = hasDrilldownSupport(country.id);
                        const badge = BADGE_CONFIG[status];
                        const accentColor = getAccentColor(status);

                        return (
                          <div 
                            key={country.id} 
                            onClick={() => selectCountry(country.id)}
                            className={`list-country-card ${isSelected ? 'list-country-card--selected' : ''}`}
                          >
                            {/* Left accent stripe */}
                            <div className="list-country-card__accent" style={{ '--card-accent': accentColor } as React.CSSProperties} />
                            
                            {/* Main row: Flag + Name + Status badge */}
                            <div className="list-country-card__main">
                              {country.flag ? (
                                <img src={country.flag} alt="" className="list-country-card__flag" />
                              ) : (
                                <div className="list-country-card__flag-placeholder" />
                              )}
                              <div className="list-country-card__info">
                                <span className="list-country-card__name" title={country.name}>{country.name}</span>
                                <span className="list-country-card__meta">{country.id} • {country.continent}</span>
                              </div>
                              {badge && (
                                <div 
                                  className="list-country-card__status-badge" 
                                  style={{ '--badge-color': badge.color } as React.CSSProperties}
                                >
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
                              
                              <div className="flex gap-1.5 shrink-0">
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
