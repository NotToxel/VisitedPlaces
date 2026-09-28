import React from 'react';
import { Ban, Check, Globe, Heart, Layers, Loader2, RotateCcw, Search, Trophy, X } from 'lucide-react';
import type { Country } from '../../data/countries';
import type { PlaceStatus, UserPlacesMap } from '../../store/useStore';
import type { TopoRegion } from '../../utils/topojsonCache';
import { hasDrilldownSupport } from '../../utils/topojsonCache';
import { fuzzyMatch } from '../../utils/searchUtils';
import { FlagImage } from '../common/FlagImage';

type StatusFilter = 'ALL' | 'VISITED' | 'WISHLIST' | 'REVISIT' | 'AVOID' | 'UNSELECTED';

interface ListDetailPanelProps {
  selectedCountry: Country | null;
  stats: {
    total: number;
    visited: number;
    wishlist: number;
    revisit: number;
    avoid: number;
    rate: number;
    continents: Record<string, { total: number; visited: number }>;
  };
  places: UserPlacesMap;
  subRegionsByCountry: Record<string, TopoRegion[]>;
  loadingSubRegions: Record<string, boolean>;
  subRegionSearch: string;
  setSubRegionSearch: React.Dispatch<React.SetStateAction<string>>;
  subRegionFilter: StatusFilter;
  setSubRegionFilter: React.Dispatch<React.SetStateAction<StatusFilter>>;
  subRegionCounts: Record<StatusFilter, number>;
  selectCountry: (id: string | null) => void;
  handleStatusChange: (id: string, status: PlaceStatus) => void;
  handleMarkAllVisited: (countryId: string) => void;
  handleClearAllRegions: (countryId: string) => void;
}

export function ListDetailPanel({
  selectedCountry, stats, places, subRegionsByCountry, loadingSubRegions,
  subRegionSearch, setSubRegionSearch, subRegionFilter, setSubRegionFilter,
  subRegionCounts, selectCountry, handleStatusChange, handleMarkAllVisited,
  handleClearAllRegions,
}: ListDetailPanelProps) {
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
            className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content shrink-0"
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
                          <span className="opacity-55 ml-0.5 font-mono text-[8px] bg-black/15 px-1 rounded-sm">
                            {subRegionCounts[mode]}
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
                                className={`btn btn-square btn-sm h-7.5 w-7.5 ${stateStatus === 'VISITED' ? 'btn-success text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-visited hover:bg-accent-visited/10'}`}
                                title="Visited"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(state.id, 'WISHLIST')}
                                className={`btn btn-square btn-sm h-7.5 w-7.5 ${stateStatus === 'WISHLIST' ? 'btn-secondary text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-wishlist hover:bg-accent-wishlist/10'}`}
                                title="Wishlist"
                              >
                                <Heart size={13} fill={stateStatus === 'WISHLIST' ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(state.id, 'REVISIT')}
                                className={`btn btn-square btn-sm h-7.5 w-7.5 ${stateStatus === 'REVISIT' ? 'btn-warning text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-revisit hover:bg-accent-revisit/10'}`}
                                title="Revisit"
                              >
                                <RotateCcw size={13} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(state.id, 'AVOID')}
                                className={`btn btn-square btn-sm h-7.5 w-7.5 ${stateStatus === 'AVOID' ? 'btn-error text-white border-none' : 'btn-ghost text-base-content/30 hover:text-accent-avoid hover:bg-accent-avoid/10'}`}
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
}
