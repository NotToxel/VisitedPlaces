import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { REST_COUNTRIES_URL } from '../config/constants';
import { useStore } from '../store/useStore';
import type { PlaceStatus } from '../store/useStore';
import { Search, Filter, Check, Heart, ChevronDown, ChevronRight, Map as MapIcon, Ban, Loader2 } from 'lucide-react';
import { fetchSubRegions, getSubRegionUrl } from '../utils/topojsonCache';
import type { TopoRegion } from '../utils/topojsonCache';

interface CountryMeta {
  id: string; // ISO-A3
  cca2: string; // ISO-A2
  name: string;
  continent: string;
  flag: string;
}

const List: React.FC = () => {
  const { places, setCountryStatus } = useStore();
  const [countries, setCountries] = useState<CountryMeta[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [searchSubRegions, setSearchSubRegions] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VISITED' | 'WISHLIST' | 'UNSELECTED'>('ALL');
  const [collapsedContinents, setCollapsedContinents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch exhaustive list from restcountries API
    fetch(`${REST_COUNTRIES_URL},independent`)
      .then(res => res.json())
      .then((data: any[]) => {
        const extracted: CountryMeta[] = data
          .filter(c => c.independent === true || c.cca3 === 'TWN' || c.cca3 === 'HKG' || c.cca3 === 'MAC')
          .map(c => ({
            id: c.cca3,
            cca2: c.cca2,
            name: c.name.common,
            continent: c.continents?.[0] || 'Other',
            flag: c.flags?.svg || ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setCountries(extracted);
      })
      .catch(err => {
        console.error("Could not load country list from API", err);
        // Fallback or handle error
      });
  }, []);

  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [subRegionsByCountry, setSubRegionsByCountry] = useState<Record<string, TopoRegion[]>>({});
  const [loadingSubRegions, setLoadingSubRegions] = useState<Record<string, boolean>>({});

  const loadSubRegions = async (id: string) => {
    if (subRegionsByCountry[id] || loadingSubRegions[id]) return;
    setLoadingSubRegions(prev => ({ ...prev, [id]: true }));
    const regions = await fetchSubRegions(id);
    setSubRegionsByCountry(prev => ({ ...prev, [id]: regions }));
    setLoadingSubRegions(prev => ({ ...prev, [id]: false }));
  };

  // Pre-load supporting sub-regions if the user wants to search by them
  useEffect(() => {
    if (searchSubRegions) {
      loadSubRegions('USA');
      loadSubRegions('GBR');
    }
  }, [searchSubRegions]);

  const filteredCountries = useMemo(() => {
      return countries.filter(c => {
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
  }, [countries, places, deferredSearch, filterMode, searchSubRegions, subRegionsByCountry]);

  // Group by continent
  const groupedPlaces = useMemo(() => {
    const groups: Record<string, typeof filteredCountries> = {};
    filteredCountries.forEach(place => {
      if (!groups[place.continent]) groups[place.continent] = [];
      groups[place.continent].push(place);
      // sort within continent
      groups[place.continent].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort continents alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, typeof filteredCountries>);
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

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header and Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={24} color="var(--accent-primary)" />
          Country Directory
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Search countries..." 
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={searchSubRegions} 
              onChange={(e) => setSearchSubRegions(e.target.checked)} 
              style={{ accentColor: 'var(--accent-primary)', width: '1rem', height: '1rem' }} 
            />
            Include Sub-regions in Search
          </label>
          
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0.25rem', overflowX: 'auto', flex: '1 1 auto', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {['ALL', 'VISITED', 'WISHLIST', 'AVOID', 'UNSELECTED'].map((mode) => (
              <button
                key={mode}
                className={`glass-button ${filterMode === mode ? 'glass-button--primary' : ''}`}
                onClick={() => setFilterMode(mode as any)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {mode === 'ALL' ? 'All' : mode === 'VISITED' ? 'Visited' : mode === 'WISHLIST' ? 'Wishlist' : mode === 'AVOID' ? "Avoid" : 'Unselected'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Showing {filteredCountries.length} countries
        </p>

        {Object.keys(groupedPlaces).length === 0 ? (
           <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
             No countries found matching your criteria.
           </div>
        ) : (
          Object.entries(groupedPlaces).map(([continent, placesInContinent]) => {
            const isCollapsed = collapsedContinents[continent];
            
            return (
              <div key={continent} style={{ marginBottom: '2rem' }}>
                <h3 
                  onClick={() => toggleContinent(continent)}
                  style={{ 
                    color: 'var(--accent-primary)', 
                    borderBottom: '1px solid var(--glass-border)', 
                    paddingBottom: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  {continent} ({placesInContinent.length})
                </h3>
                
                {!isCollapsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
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
                                  countryStates = matchingStates; // only show matched states
                                  if (!isExpanded && !countryNameMatches) {
                                      isExpanded = true; // auto-expand if country didn't match but states did
                                  }
                              } else if (!countryNameMatches && !isExpanded) {
                                  countryStates = []; // Nothing matched and not manually expanded
                              }
                          }
                      }

                      return (
                        <div key={country.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div
                          className="glass-panel"
                          style={{
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderStyle: 'solid',
                            borderWidth: '1px',
                            transition: 'transform 0.2s, border-color 0.2s, background-color 0.2s',
                            borderColor: status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : status === 'AVOID' ? '#ef4444' : 'var(--glass-border)',
                            background: status !== 'NONE' ? (status === 'VISITED' ? 'rgba(34,197,94,0.05)' : status === 'WISHLIST' ? 'rgba(187,154,247,0.05)' : 'rgba(239,68,68,0.05)') : 'transparent'
                          }}
                        >
                          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {country.flag ? (
                              <img src={country.flag} alt={`${country.name} flag`} style={{ width: '1.5rem', height: '1.2rem', objectFit: 'cover', borderRadius: '2px' }} />
                            ) : (
                              <div style={{ width: '1.5rem', height: '1.2rem', background: 'var(--map-fill-hover)', borderRadius: '2px' }} />
                            )}
                            <div>
                              {country.name}
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                {country.id}
                              </div>
                            </div>
                            
                            {/* Expand button — only shown if sub-regions are available for this country */}
                            {getSubRegionUrl(country.id) !== null && (
                              <button
                                 className="glass-button"
                                 style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const isNowExpanded = !expandedCountries[country.id];
                                   setExpandedCountries(prev => ({ ...prev, [country.id]: isNowExpanded }));
                                   if (isNowExpanded) loadSubRegions(country.id);
                                 }}
                                 title="View Regions"
                              >
                                 {loadingSubRegions[country.id] ? <Loader2 size={18} className="animate-spin" /> : (isExpanded ? <ChevronDown size={18} /> : <MapIcon size={18} />)}
                              </button>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleStatusChange(country.id, 'VISITED')}
                              title="Mark as Visited"
                              style={{
                                background: status === 'VISITED' ? 'var(--accent-visited)' : 'var(--map-fill-unselected)',
                                color: status === 'VISITED' ? '#000' : 'var(--text-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.4rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => handleStatusChange(country.id, 'WISHLIST')}
                              title="Add to Wishlist"
                              style={{
                                background: status === 'WISHLIST' ? 'var(--accent-wishlist)' : 'var(--map-fill-unselected)',
                                color: status === 'WISHLIST' ? '#000' : 'var(--text-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.4rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Heart size={16} />
                            </button>
                            <button 
                              onClick={() => handleStatusChange(country.id, 'AVOID')}
                              title="Don't want to go"
                              style={{
                                background: status === 'AVOID' ? '#ef4444' : 'var(--map-fill-unselected)',
                                color: status === 'AVOID' ? '#fff' : 'var(--text-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.4rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Ban size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {isExpanded && countryStates.length > 0 && (
                          <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {countryStates.map(state => {
                              // state.id from topojsonCache is already prefixed (e.g., USA-72, GBR-JEY)
                              const stateId = (state.id.toString().startsWith(`${country.id}-`)) ? state.id : `${country.id}-${state.id}`;
                              const stateStatus = places[stateId]?.status || 'NONE';
                              
                              return (
                                <div key={stateId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--map-fill-unselected)', borderRadius: '4px', borderLeft: `2px solid ${stateStatus === 'VISITED' ? 'var(--accent-visited)' : stateStatus === 'WISHLIST' ? 'var(--accent-wishlist)' : stateStatus === 'AVOID' ? '#ef4444' : 'transparent'}` }}>
                                  <span style={{ fontSize: '0.9rem' }}>{state.name}</span>
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button 
                                      className={`glass-button ${stateStatus === 'VISITED' ? 'glass-button--primary' : ''}`}
                                      style={{ padding: '0.25rem 0.5rem', minWidth: 'unset', fontSize: '0.75rem' }}
                                      onClick={() => setCountryStatus(stateId, stateStatus === 'VISITED' ? 'NONE' : 'VISITED')}
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button 
                                      className={`glass-button ${stateStatus === 'WISHLIST' ? 'glass-button--primary' : ''}`}
                                      style={{ padding: '0.25rem 0.5rem', minWidth: 'unset', fontSize: '0.75rem' }}
                                      onClick={() => setCountryStatus(stateId, stateStatus === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                                    >
                                      <Heart size={12} />
                                    </button>
                                    <button 
                                      className={`glass-button`}
                                      style={{ padding: '0.25rem 0.5rem', minWidth: 'unset', fontSize: '0.75rem', background: stateStatus === 'AVOID' ? '#ef4444' : '', color: stateStatus === 'AVOID' ? '#fff' : '' }}
                                      onClick={() => setCountryStatus(stateId, stateStatus === 'AVOID' ? 'NONE' : 'AVOID')}
                                      title="Don't want to go"
                                    >
                                      <Ban size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {isExpanded && countryStates.length === 0 && !loadingSubRegions[country.id] && (
                          <div style={{ paddingLeft: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
