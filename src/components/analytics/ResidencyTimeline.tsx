import React, { useMemo } from 'react';
import { Home, AlertTriangle, Calendar } from 'lucide-react';
import type { UserPlacesMap, ResidencyPeriod } from '../../store/useStore';
import { COUNTRIES } from '../../data/countries';
import { FlagImage } from '../common/FlagImage';

interface ResidencyTimelineProps {
  places: UserPlacesMap;
}

interface PlaceResidencyTrack {
  id: string;
  name: string;
  isSubRegion: boolean;
  parentCountryId?: string;
  periods: ResidencyPeriod[];
}

// Helper to parse year/month into decimal year (e.g., "2018-06" => 2018.45)
function parseDecimalYear(dateStr?: string, isEnd = false): number | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;

  if (parts.length === 1) {
    return isEnd ? year + 1.0 : year;
  }
  const month = parseInt(parts[1], 10);
  if (isNaN(month) || month < 1 || month > 12) return isEnd ? year + 1.0 : year;

  return year + (month - 1) / 12 + (isEnd ? 1 / 12 : 0);
}

export const ResidencyTimeline: React.FC<ResidencyTimelineProps> = ({ places }) => {
  const currentYear = new Date().getFullYear();

  // Extract all tracks of places marked as lived
  const { tracks, allPlacesWithoutPeriods, currentHomes, hasConflict } = useMemo(() => {
    const list: PlaceResidencyTrack[] = [];
    const noPeriods: { id: string; name: string }[] = [];
    const currentList: string[] = [];
    let overlappingConflict = false;

    // Map countries
    COUNTRIES.forEach((country) => {
      const p = places[country.id];
      if (!p || !p.lived) return;

      const periods = p.periods && p.periods.length > 0 ? p.periods : [];
      if (periods.length > 0) {
        list.push({
          id: country.id,
          name: country.name,
          isSubRegion: false,
          periods
        });
        if (periods.some((period) => period.current)) {
          currentList.push(country.name);
        }
      } else {
        noPeriods.push({ id: country.id, name: country.name });
      }

      // Check sub-regions with periods
      if (p.regionPeriods) {
        Object.entries(p.regionPeriods).forEach(([regId, rPeriods]) => {
          if (rPeriods && rPeriods.length > 0) {
            list.push({
              id: regId,
              name: regId, // Sub-region code
              isSubRegion: true,
              parentCountryId: country.id,
              periods: rPeriods
            });
            if (rPeriods.some((period) => period.current)) {
              currentList.push(`${regId} (${country.name})`);
            }
          }
        });
      }
    });

    if (currentList.length > 1) {
      overlappingConflict = true;
    }

    return {
      tracks: list,
      allPlacesWithoutPeriods: noPeriods,
      currentHomes: currentList,
      hasConflict: overlappingConflict
    };
  }, [places]);

  // Compute timeline boundaries
  const { minYear, maxYear, yearTicks, totalYearsSpan } = useMemo(() => {
    let min = currentYear - 5;
    let max = currentYear;

    tracks.forEach((track) => {
      track.periods.forEach((p) => {
        const s = parseDecimalYear(p.start);
        if (s !== null) min = Math.min(min, Math.floor(s));
        if (p.current) {
          max = Math.max(max, currentYear);
        } else {
          const e = parseDecimalYear(p.end, true);
          if (e !== null) max = Math.max(max, Math.ceil(e));
        }
      });
    });

    // Ensure at least a 3-year window
    if (max - min < 3) max = min + 3;

    // Generate integer ticks
    const step = max - min > 16 ? 4 : max - min > 8 ? 2 : 1;
    const ticks: number[] = [];
    for (let y = min; y <= max; y += step) {
      ticks.push(y);
    }
    if (ticks[ticks.length - 1] !== max) {
      ticks.push(max);
    }

    // Rough cumulative years estimation
    let totalYears = 0;
    tracks.forEach((track) => {
      track.periods.forEach((p) => {
        const s = parseDecimalYear(p.start);
        const e = p.current ? currentYear + (new Date().getMonth() + 1) / 12 : parseDecimalYear(p.end, true);
        if (s !== null && e !== null && e > s) {
          totalYears += (e - s);
        }
      });
    });

    return {
      minYear: min,
      maxYear: max,
      yearTicks: ticks,
      totalYearsSpan: Math.max(0, Math.round(totalYears * 10) / 10)
    };
  }, [tracks, currentYear]);

  const totalCountriesLived = useMemo(() => {
    return Object.entries(places).filter(([k, v]) => v.lived && !k.includes('-')).length;
  }, [places]);

  if (totalCountriesLived === 0 && tracks.length === 0) {
    return (
      <div className="glass-panel border border-base-300/40 p-5 rounded-2xl bg-base-200/20 text-center flex flex-col items-center justify-center gap-2 select-none">
        <Home size={28} className="text-primary opacity-30" />
        <h4 className="font-bold text-sm text-base-content">Places Called Home</h4>
        <p className="text-xs text-base-content/50 max-w-md">
          You haven't marked any places as lived yet. Click on any country in the map context menu or place directory to mark where you have lived and log stays.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-base-300/40 p-5 rounded-2xl bg-base-200/20 flex flex-col gap-4 select-none min-w-0">
      {/* Header and Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base-300/30 pb-3">
        <div className="flex items-center gap-2">
          <Home size={16} className="text-primary" />
          <h3 className="font-bold text-sm text-base-content uppercase tracking-wider">
            Places Called Home
          </h3>
        </div>

        {hasConflict && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            <AlertTriangle size={12} />
            <span>Needs review: multiple current home bases detected.</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-base-300/15 border border-base-300/30 rounded-xl p-3 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-base-content/40">Countries Lived</span>
          <span className="text-xl font-extrabold text-primary mt-0.5">{totalCountriesLived}</span>
          <span className="text-[9px] text-base-content/50 mt-0.5">National residences</span>
        </div>

        <div className="bg-base-300/15 border border-base-300/30 rounded-xl p-3 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-base-content/40">Residency Tracks</span>
          <span className="text-xl font-extrabold text-primary mt-0.5">{tracks.length}</span>
          <span className="text-[9px] text-base-content/50 mt-0.5">Tracked timeline entries</span>
        </div>

        <div className="bg-base-300/15 border border-base-300/30 rounded-xl p-3 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-base-content/40">Est. Total Span</span>
          <span className="text-xl font-extrabold text-accent-revisit mt-0.5">
            {totalYearsSpan > 0 ? `${totalYearsSpan} yrs` : '—'}
          </span>
          <span className="text-[9px] text-base-content/50 mt-0.5">Cumulative time logged</span>
        </div>

        <div className="bg-base-300/15 border border-base-300/30 rounded-xl p-3 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-base-content/40">Current Base</span>
          <span className="text-sm font-extrabold text-accent-visited mt-1 truncate">
            {currentHomes.length > 0 ? currentHomes.join(', ') : 'None marked'}
          </span>
          <span className="text-[9px] text-base-content/50 mt-0.5">Ongoing residence</span>
        </div>
      </div>

      {/* Timeline Chart View */}
      {tracks.length > 0 && (
        <div className="flex flex-col gap-3 mt-2 bg-base-300/10 border border-base-300/30 rounded-xl p-4 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-base-content/70">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Residency Chronology</span>
            </span>
            <span className="text-[10px] text-base-content/40 font-mono">
              {minYear} – {maxYear}
            </span>
          </div>

          {/* Chronological multi-track chart */}
          <div className="flex flex-col gap-2.5 overflow-x-auto pt-2 pb-1">
            {/* Year markers Header */}
            <div className="flex items-center pl-32 pr-2 relative h-5 border-b border-base-300/40 text-[10px] font-mono text-base-content/40">
              {yearTicks.map((year) => {
                const leftPercent = ((year - minYear) / (maxYear - minYear)) * 100;
                return (
                  <span
                    key={year}
                    className="absolute -translate-x-1/2"
                    style={{ left: `calc(128px + (100% - 136px) * ${leftPercent / 100})` }}
                  >
                    {year}
                  </span>
                );
              })}
            </div>

            {/* Individual Tracks */}
            {tracks.map((track) => {
              const placeId = track.parentCountryId || track.id;

              return (
                <div key={track.id} className="flex items-center gap-3 relative min-h-[32px] group">
                  {/* Left Label */}
                  <div className="w-28 flex items-center gap-1.5 shrink-0 truncate">
                    <FlagImage placeId={placeId} className="w-4 h-3 object-contain shrink-0 rounded-xs" />
                    <span className="text-xs font-bold text-base-content truncate" title={track.name}>
                      {track.name}
                    </span>
                  </div>

                  {/* Track line & period bars */}
                  <div className="flex-1 relative h-6 bg-base-300/20 rounded-md overflow-hidden">
                    {/* Gridlines */}
                    {yearTicks.map((year) => {
                      const leftPercent = ((year - minYear) / (maxYear - minYear)) * 100;
                      return (
                        <div
                          key={year}
                          className="absolute top-0 bottom-0 border-l border-base-300/30"
                          style={{ left: `${leftPercent}%` }}
                        />
                      );
                    })}

                    {/* Period Blocks */}
                    {track.periods.map((period) => {
                      const startDec = parseDecimalYear(period.start) ?? minYear;
                      const endDec = period.current
                        ? currentYear + (new Date().getMonth() + 1) / 12
                        : (parseDecimalYear(period.end, true) ?? startDec + 1);

                      const clampedStart = Math.max(minYear, startDec);
                      const clampedEnd = Math.min(maxYear, Math.max(clampedStart + 0.1, endDec));

                      const left = ((clampedStart - minYear) / (maxYear - minYear)) * 100;
                      const width = Math.max(1.5, ((clampedEnd - clampedStart) / (maxYear - minYear)) * 100);

                      return (
                        <div
                          key={period.id}
                          className={`absolute top-1 bottom-1 rounded-sm text-[9px] font-bold flex items-center px-1.5 overflow-hidden transition-all shadow-sm ${
                            period.current
                              ? 'bg-accent-visited text-white'
                              : 'bg-primary/80 text-base-content border border-primary'
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${track.name}: ${period.start} – ${period.current ? 'Present' : period.end || '?'}${period.note ? ` (${period.note})` : ''}`}
                        >
                          <span className="truncate">
                            {period.current ? 'Present' : period.start}
                            {period.note ? ` • ${period.note}` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Untimed Lived Places Pill Ledger */}
      {allPlacesWithoutPeriods.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-base-300/30">
          <span className="text-[10px] font-bold uppercase text-base-content/40 tracking-wider">
            Marked as Home (Dates not logged yet)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allPlacesWithoutPeriods.map((place) => (
              <span
                key={place.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-base-300/25 border border-base-300/40 text-xs font-semibold text-base-content"
              >
                <FlagImage placeId={place.id} className="w-3.5 h-2.5 object-contain" />
                <span>{place.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
