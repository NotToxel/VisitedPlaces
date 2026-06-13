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

  return (
    <div className="page-container page-transition">
      {/* Header and Controls */}
      <div className="glass-panel directory-controls">
        <h2 className="directory-controls-title">
          <Filter size={24} color="var(--accent-primary)" />
          Country Directory
        </h2>
        
        <div className="directory-controls-row">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input 
              type="text" 
              className="glass-input search-input-field" 
              placeholder="Search countries..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              className="checkbox-input"
              checked={searchSubRegions} 
              onChange={(e) => setSearchSubRegions(e.target.checked)} 
            />
            Include Sub-regions in Search
          </label>
          
          <div className="filter-buttons-wrapper">
            {(['ALL', 'VISITED', 'WISHLIST', 'REVISIT', 'AVOID', 'UNSELECTED'] as const).map((mode) => (
              <button
                key={mode}
                className={`glass-button ${filterMode === mode ? 'glass-button--primary' : ''}`}
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

      {/* Grid */}
      <div className="glass-panel directory-grid-panel" style={{ padding: '1.25rem' }}>
        <p className="directory-stats">
          Showing {filteredCountries.length} countries
        </p>

        {Object.keys(groupedPlaces).length === 0 ? (
          <div className="directory-empty">
            No countries found matching your criteria.
          </div>
        ) : (
          Object.entries(groupedPlaces).map(([continent, placesInContinent]) => {
            const isCollapsed = collapsedContinents[continent];
            
            return (
              <div key={continent} className="continent-section">
                <h3 
                  onClick={() => toggleContinent(continent)}
                  className="continent-title"
                >
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  {continent} ({placesInContinent.length})
                </h3>
                
                {!isCollapsed && (
                  <div className="countries-grid">
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

                      const cardClass = `country-card ${
                        status === 'VISITED' ? 'country-card--visited' : 
                        status === 'WISHLIST' ? 'country-card--wishlist' : 
                        status === 'AVOID' ? 'country-card--avoid' : 
                        status === 'REVISIT' ? 'country-card--revisit' : ''
                      }`;

                      return (
                        <div key={country.id} className="country-card-container">
                          <div className={cardClass}>
                            <div className="country-info">
                              {/* Expand button placed first for vertical alignment alignment of flags/names */}
                              {getSubRegionUrl(country.id) !== null ? (
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isNowExpanded = !expandedCountries[country.id];
                                    setExpandedCountries(prev => ({ ...prev, [country.id]: isNowExpanded }));
                                    if (isNowExpanded) loadSubRegions(country.id);
                                  }}
                                  title="View Regions"
                                  style={{ flexShrink: 0 }}
                                >
                                  {loadingSubRegions[country.id] ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    isExpanded ? <ChevronDown size={14} /> : <MapIcon size={14} />
                                  )}
                                </button>
                              ) : (
                                <div style={{ width: '28px', flexShrink: 0 }} />
                              )}

                              {country.flag ? (
                                <img src={country.flag} alt="" className="country-flag" />
                              ) : (
                                <div className="country-flag-placeholder" />
                              )}
                              <div className="country-name-wrapper">
                                <span>{country.name}</span>
                                <span className="country-id-sub">{country.id}</span>
                              </div>
                            </div>
                            
                            <div className="country-actions">
                              <button 
                                onClick={() => handleStatusChange(country.id, 'VISITED')}
                                title="Mark as Visited"
                                className={`action-btn ${status === 'VISITED' ? 'action-btn--visited' : ''}`}
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(country.id, 'WISHLIST')}
                                title="Add to Wishlist"
                                className={`action-btn ${status === 'WISHLIST' ? 'action-btn--wishlist' : ''}`}
                              >
                                <Heart size={14} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(country.id, 'REVISIT')}
                                title="Mark as Revisit"
                                className={`action-btn ${status === 'REVISIT' ? 'action-btn--revisit' : ''}`}
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(country.id, 'AVOID')}
                                title="Don't want to go"
                                className={`action-btn ${status === 'AVOID' ? 'action-btn--avoid' : ''}`}
                              >
                                <Ban size={14} />
                              </button>
                            </div>
                          </div>
                          
                          {isExpanded && countryStates.length > 0 && (
                            <div className="subregions-container">
                              {countryStates.map(state => {
                                const stateId = (state.id.toString().startsWith(`${country.id}-`)) ? state.id : `${country.id}-${state.id}`;
                                const stateStatus = places[stateId]?.status || 'NONE';
                                
                                const rowClass = `subregion-row ${
                                  stateStatus === 'VISITED' ? 'subregion-row--visited' :
                                  stateStatus === 'WISHLIST' ? 'subregion-row--wishlist' :
                                  stateStatus === 'AVOID' ? 'subregion-row--avoid' :
                                  stateStatus === 'REVISIT' ? 'subregion-row--revisit' : ''
                                }`;

                                return (
                                  <div key={stateId} className={rowClass}>
                                    <span className="subregion-name">{state.name}</span>
                                    <div className="subregion-actions">
                                      <button 
                                        className={`action-btn ${stateStatus === 'VISITED' ? 'action-btn--visited' : ''}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'VISITED' ? 'NONE' : 'VISITED')}
                                        title="Visited"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button 
                                        className={`action-btn ${stateStatus === 'WISHLIST' ? 'action-btn--wishlist' : ''}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                                        title="Wishlist"
                                      >
                                        <Heart size={12} />
                                      </button>
                                      <button 
                                        className={`action-btn ${stateStatus === 'REVISIT' ? 'action-btn--revisit' : ''}`}
                                        onClick={() => setCountryStatus(stateId, stateStatus === 'REVISIT' ? 'NONE' : 'REVISIT')}
                                        title="Mark as Revisit"
                                      >
                                        <RotateCcw size={12} />
                                      </button>
                                      <button 
                                        className={`action-btn ${stateStatus === 'AVOID' ? 'action-btn--avoid' : ''}`}
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
                            <div className="subregions-container" style={{ borderLeft: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
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
