import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { COUNTRIES } from '../data/countries';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, Globe, Award, Trophy, ShieldCheck, Compass, Heart, CheckCircle2, Lock, Milestone } from 'lucide-react';
import { fetchSubRegions, hasDrilldownSupport } from '../utils/topojsonCache';

const Analytics: React.FC = () => {
  const { places } = useStore();
  const totalCountries = COUNTRIES.length;

  const countryContinents = useMemo(() => {
    const map: Record<string, string> = {};
    COUNTRIES.forEach(c => {
      map[c.id] = c.continent;
    });
    return map;
  }, []);

  const { stats, continentCounts } = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    let revisit = 0;
    let avoid = 0;
    
    const continentCounts: Record<string, { visited: number, wishlist: number, revisit: number, total: number }> = {};
    
    Object.values(countryContinents).forEach(cont => {
      if (!continentCounts[cont]) {
        continentCounts[cont] = { visited: 0, wishlist: 0, revisit: 0, total: 0 };
      }
      continentCounts[cont].total++;
    });

    Object.entries(countryContinents).forEach(([id, continent]) => {
      const place = places[id];
      if (place) {
        if (place.status === 'VISITED') {
          visited++;
          continentCounts[continent].visited++;
        } else if (place.status === 'WISHLIST') {
          wishlist++;
          continentCounts[continent].wishlist++;
        } else if (place.status === 'REVISIT') {
          revisit++;
          continentCounts[continent].revisit++;
        } else if (place.status === 'AVOID') {
          avoid++;
        }
      }
    });

    const unselected = totalCountries - visited - wishlist - revisit;

    return { 
      stats: { visited, wishlist, revisit, avoid, unselected }, 
      continentCounts
    };
  }, [places, totalCountries, countryContinents]);

  const totalExplored = stats.visited + stats.revisit;
  const percentVisited = totalCountries > 0 ? ((totalExplored / totalCountries) * 100).toFixed(1) : '0';

  // Sub-region dynamic totals loader
  const [subRegionTotals, setSubRegionTotals] = useState<Record<string, number>>({
    'USA': 51,
    'GBR': 124
  });

  // Load sub-regions dynamically to get total counts
  useEffect(() => {
    // Find all countries that have at least one tracked sub-region
    const countriesWithRegions = new Set<string>();
    Object.entries(places).forEach(([key, value]) => {
      if (key.includes('-')) {
        countriesWithRegions.add(key.split('-')[0]);
      } else if (value.regions && Object.keys(value.regions).length > 0) {
        countriesWithRegions.add(key);
      }
    });

    countriesWithRegions.forEach((countryId) => {
      if (subRegionTotals[countryId] === undefined) {
        fetchSubRegions(countryId).then(list => {
          if (list && list.length > 0) {
            setSubRegionTotals(prev => ({
              ...prev,
              [countryId]: list.length
            }));
          }
        });
      }
    });
  }, [places, subRegionTotals]);

  // Aggregate sub-region stats per country
  const subRegionStats = useMemo(() => {
    const statsMap: Record<string, { visited: number; wishlist: number; avoid: number; total: number }> = {};
    
    Object.entries(places).forEach(([key, value]) => {
      // 1. Process flat keys
      if (key.includes('-')) {
        const [parentCode] = key.split('-');
        if (!hasDrilldownSupport(parentCode)) return;
        
        if (!statsMap[parentCode]) {
          statsMap[parentCode] = { visited: 0, wishlist: 0, avoid: 0, total: subRegionTotals[parentCode] || 0 };
        }
        
        if (value.status === 'VISITED' || value.status === 'REVISIT') statsMap[parentCode].visited++;
        if (value.status === 'WISHLIST') statsMap[parentCode].wishlist++;
        if (value.status === 'AVOID') statsMap[parentCode].avoid++;
      }
      // 2. Process nested keys
      else if (value.regions) {
        if (!hasDrilldownSupport(key)) return;
        
        if (!statsMap[key]) {
          statsMap[key] = { visited: 0, wishlist: 0, avoid: 0, total: subRegionTotals[key] || 0 };
        }
        
        Object.entries(value.regions).forEach(([regKey, regStatus]) => {
          // If the flat key was already counted above, skip it to avoid double-counting
          if (places[regKey]) return;
          
          if (regStatus === 'VISITED' || regStatus === 'REVISIT') statsMap[key].visited++;
          if (regStatus === 'WISHLIST') statsMap[key].wishlist++;
          if (regStatus === 'AVOID') statsMap[key].avoid++;
        });
      }
    });

    // Transform map to sorted list
    return Object.entries(statsMap)
      .map(([countryId, item]) => {
        const country = COUNTRIES.find(c => c.id === countryId);
        const explored = item.visited;
        const total = item.total || explored; // fallback to explored if total not loaded yet
        const percent = total > 0 ? Math.round((explored / total) * 100) : 0;
        
        return {
          countryId,
          countryName: country?.name || countryId,
          flag: country?.flag || '',
          visited: item.visited,
          wishlist: item.wishlist,
          avoid: item.avoid,
          total,
          percent
        };
      })
      .filter(item => (item.visited + item.wishlist + item.avoid) > 0)
      .sort((a, b) => b.percent - a.percent);
  }, [places, subRegionTotals]);

  // Traveler Level & Milestones Calculator
  const levelInfo = useMemo(() => {
    if (totalExplored < 5) {
      return {
        level: 1,
        name: 'Novice Explorer',
        current: totalExplored,
        target: 5,
        percent: Math.min((totalExplored / 5) * 100, 100)
      };
    } else if (totalExplored < 15) {
      return {
        level: 2,
        name: 'Globetrotter Apprentice',
        current: totalExplored,
        target: 15,
        percent: Math.min(((totalExplored - 5) / 10) * 100, 100)
      };
    } else if (totalExplored < 30) {
      return {
        level: 3,
        name: 'Wanderer',
        current: totalExplored,
        target: 30,
        percent: Math.min(((totalExplored - 15) / 15) * 100, 100)
      };
    } else if (totalExplored < 60) {
      return {
        level: 4,
        name: 'World Citizen',
        current: totalExplored,
        target: 60,
        percent: Math.min(((totalExplored - 30) / 30) * 100, 100)
      };
    } else if (totalExplored < 100) {
      return {
        level: 5,
        name: 'Globe Trotter',
        current: totalExplored,
        target: 100,
        percent: Math.min(((totalExplored - 60) / 40) * 100, 100)
      };
    } else {
      return {
        level: 6,
        name: 'Master Voyager',
        current: totalExplored,
        target: totalExplored,
        percent: 100
      };
    }
  }, [totalExplored]);

  // Dynamic Achievements Calculator
  const achievements = useMemo(() => {
    // Count unique sub-regions that are VISITED or REVISIT
    let subRegionExploredCount = 0;
    const countedKeys = new Set<string>();

    Object.entries(places).forEach(([key, val]) => {
      if (key.includes('-') && (val?.status === 'VISITED' || val?.status === 'REVISIT')) {
        if (!countedKeys.has(key)) {
          countedKeys.add(key);
          subRegionExploredCount++;
        }
      } else if (!key.includes('-') && val?.regions) {
        Object.entries(val.regions).forEach(([regKey, regStatus]) => {
          if ((regStatus === 'VISITED' || regStatus === 'REVISIT') && !countedKeys.has(regKey)) {
            countedKeys.add(regKey);
            subRegionExploredCount++;
          }
        });
      }
    });

    const visitedContinents = Object.values(continentCounts).filter(c => (c.visited + c.revisit) >= 1).length;

    return [
      {
        id: 'first_step',
        title: 'First Steps',
        desc: 'Visit your first country.',
        unlocked: totalExplored >= 1,
        progress: `${totalExplored > 0 ? 1 : 0} / 1`,
        icon: Compass
      },
      {
        id: 'continent_strider',
        title: 'Continent Strider',
        desc: 'Explore at least one country in 3 continents.',
        unlocked: visitedContinents >= 3,
        progress: `${visitedContinents} / 3`,
        icon: Globe
      },
      {
        id: 'wishful_thinker',
        title: 'Wishful Thinker',
        desc: 'Add 10 places to your wishlist.',
        unlocked: stats.wishlist >= 10,
        progress: `${stats.wishlist} / 10`,
        icon: Heart
      },
      {
        id: 'regional_expert',
        title: 'Regional Expert',
        desc: 'Track at least 5 sub-regions (states/counties).',
        unlocked: subRegionExploredCount >= 5,
        progress: `${subRegionExploredCount} / 5`,
        icon: Milestone
      },
      {
        id: 'global_citizen',
        title: 'Global Citizen',
        desc: 'Visit 15 countries.',
        unlocked: totalExplored >= 15,
        progress: `${totalExplored} / 15`,
        icon: ShieldCheck
      },
      {
        id: 'world_explorer',
        title: 'World Explorer',
        desc: 'Reach 50 countries explored.',
        unlocked: totalExplored >= 50,
        progress: `${totalExplored} / 50`,
        icon: Trophy
      }
    ];
  }, [places, totalExplored, stats.wishlist, continentCounts]);

  // Leaderboard data sorted by coverage percentage
  const leaderboardData = useMemo(() => {
    return Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other' && name !== 'Antarctica')
      .map(([name, data]) => {
        const explored = data.visited + data.revisit;
        const percent = data.total > 0 ? Math.round((explored / data.total) * 100) : 0;
        return {
          name,
          explored,
          total: data.total,
          percent
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [continentCounts]);

  // Stacked BarChart Data
  const barChartData = useMemo(() => {
    return Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other' && name !== 'Antarctica')
      .map(([name, data]) => {
        const explored = data.visited + data.revisit;
        const unexplored = data.total - explored - data.wishlist;
        return {
          name,
          Visited: explored,
          Wishlist: data.wishlist,
          Unexplored: unexplored > 0 ? unexplored : 0
        };
      });
  }, [continentCounts]);

  return (
    <div className="p-3 md:p-6 h-full flex flex-col gap-4 overflow-hidden bg-transparent max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="glass-panel border border-base-300/50 p-4 rounded-2xl shrink-0 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary animate-pulse" />
          <h2 className="font-extrabold text-sm text-base-content tracking-wide uppercase">Analytics Dashboard</h2>
        </div>
        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Globe size={11} /> Global View
        </span>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1 pb-4">
        
        {/* Row 1: Traveler Level & Global Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 select-none">
          
          {/* Traveler Level Gamified Widget */}
          <div className="lg:col-span-2 glass-panel border border-base-300/40 p-4.5 rounded-2xl bg-base-200/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-[0.03] text-primary select-none pointer-events-none">
              <Trophy size={180} />
            </div>
            
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Explorer Standing</span>
                <h3 className="text-xl font-extrabold text-base-content mt-1 flex items-center gap-2">
                  <Award className="text-accent-visited w-6 h-6 shrink-0" />
                  Level {levelInfo.level}: {levelInfo.name}
                </h3>
              </div>
              <div className="text-right flex flex-col">
                <span className="text-2xl font-black text-primary">{percentVisited}%</span>
                <span className="text-[9px] font-bold text-base-content/40 uppercase mt-0.5">Total Coverage</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-[10px] font-bold text-base-content/60 mb-1.5">
                <span>Milestone Progress</span>
                <span>
                  {levelInfo.level === 6 
                    ? `${totalExplored} countries explored` 
                    : `${totalExplored} / ${levelInfo.target} countries to Level ${levelInfo.level + 1}`}
                </span>
              </div>
              <div className="w-full bg-base-300/45 border border-base-300/20 rounded-full h-3.5 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-primary to-accent-visited h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(122,162,247,0.3)]"
                  style={{ width: `${levelInfo.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Core Counters Widget */}
          <div className="glass-panel border border-base-300/40 p-4.5 rounded-2xl bg-base-200/20 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-1.5 border-b border-base-300/30 pb-2">
              <Globe className="text-primary w-4.5 h-4.5 shrink-0" />
              <span className="text-[10px] font-bold text-base-content/60 uppercase tracking-wide">Travel Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-center flex-1 items-center">
              <div className="flex flex-col py-1">
                <span className="text-[10px] font-semibold text-base-content/50 uppercase">Visited</span>
                <span className="text-xl font-black text-accent-visited mt-0.5">{stats.visited}</span>
              </div>
              <div className="flex flex-col py-1 border-x border-base-300/40">
                <span className="text-[10px] font-semibold text-base-content/50 uppercase">Revisit</span>
                <span className="text-xl font-black text-accent-revisit mt-0.5">{stats.revisit}</span>
              </div>
              <div className="flex flex-col py-1">
                <span className="text-[10px] font-semibold text-base-content/50 uppercase">Wishlist</span>
                <span className="text-xl font-black text-accent-wishlist mt-0.5">{stats.wishlist}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Continent Leaderboard & Grouped Stacked BarChart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
          
          {/* Continent Progress Leaderboard */}
          <div className="glass-panel border border-base-300/40 p-4.5 rounded-2xl bg-base-200/20 flex flex-col gap-3 h-80 select-none overflow-hidden">
            <h3 className="flex items-center gap-2 font-bold text-xs text-base-content uppercase tracking-wider border-b border-base-300/30 pb-2">
              <Milestone size={14} className="text-primary shrink-0" />
              Continent Leaderboard
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {leaderboardData.map((cont, idx) => (
                <div key={cont.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-base-content">
                      <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono shrink-0
                        ${idx === 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
                        ${idx === 1 ? 'bg-slate-300/10 text-slate-300 border border-slate-300/20' : ''}
                        ${idx === 2 ? 'bg-amber-700/10 text-amber-600 border border-amber-700/20' : 'bg-base-300/20 text-base-content/40'}
                      `}>
                        {idx + 1}
                      </span>
                      <span>{cont.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-base-content/40 font-bold font-mono">
                        {cont.explored} / {cont.total}
                      </span>
                      <span className="font-extrabold text-xs text-primary">{cont.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-base-300/35 border border-base-300/15 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700
                        ${idx === 0 ? 'bg-amber-500' : 'bg-primary'}
                      `}
                      style={{ width: `${cont.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Stacked Bar Chart comparing totals */}
          <div className="glass-panel border border-base-300/40 p-4.5 rounded-2xl bg-base-200/20 flex flex-col gap-3 h-80 select-none overflow-hidden">
            <h3 className="flex items-center gap-2 font-bold text-xs text-base-content uppercase tracking-wider border-b border-base-300/30 pb-2">
              <BarChart3 size={14} className="text-primary shrink-0" />
              Regional Profile Comparison
            </h3>
            <div className="flex-1 min-h-0 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(240, 240, 240, 0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-base-content)" opacity={0.6} fontSize={9} tickLine={false} />
                  <YAxis stroke="var(--text-base-content)" opacity={0.6} fontSize={9} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-base-200)', 
                      borderColor: 'var(--glass-border)', 
                      borderRadius: '12px',
                      color: 'var(--text-base-content)',
                      fontSize: '11px'
                    }} 
                  />
                  <Legend verticalAlign="top" height={32} iconSize={8} formatter={(value) => <span className="text-[10px] font-semibold text-base-content/85">{value}</span>} />
                  <Bar dataKey="Visited" stackId="a" fill="var(--accent-visited)" />
                  <Bar dataKey="Wishlist" stackId="a" fill="var(--accent-wishlist)" />
                  <Bar dataKey="Unexplored" stackId="a" fill="var(--bg-base-300)" opacity={0.45} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Dynamic Sub-regions Exploration Progress */}
        {subRegionStats.length > 0 && (
          <div className="glass-panel border border-base-300/40 p-4.5 rounded-2xl bg-base-200/20 flex flex-col gap-3 shrink-0">
            <h3 className="flex items-center gap-2 font-bold text-xs text-base-content uppercase tracking-wider border-b border-base-300/30 pb-2 select-none">
              <Milestone size={14} className="text-primary shrink-0" />
              Sub-regions Exploration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subRegionStats.map((item) => (
                <div key={item.countryId} className="bg-base-300/10 border border-base-300/25 rounded-xl p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.flag ? (
                        <img src={item.flag} alt="" className="w-6 h-4 object-cover rounded-sm border border-base-300/30 shrink-0" />
                      ) : (
                        <div className="w-6 h-4 bg-base-300 rounded-sm shrink-0" />
                      )}
                      <span className="font-bold text-[12px] text-base-content truncate">{item.countryName}</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-primary font-mono">{item.percent}%</span>
                  </div>

                  <div className="w-full bg-base-300/35 border border-base-300/15 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-700" 
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-base-content/55 font-semibold">
                    <span>{item.visited} / {item.total} Visited</span>
                    {item.wishlist > 0 && <span>{item.wishlist} Wishlist</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Achievements & Dynamic Milestones */}
        <div className="flex flex-col gap-3 shrink-0">
          <h3 className="flex items-center gap-1.5 font-bold text-xs text-base-content uppercase tracking-wider mt-1 select-none">
            <Trophy size={16} className="text-primary shrink-0" />
            Milestones & Achievements
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((ach) => {
              const IconComp = ach.icon;
              return (
                <div 
                  key={ach.id} 
                  className={`glass-panel border p-3 rounded-xl flex items-center gap-3 relative transition-all duration-300 select-none
                    ${ach.unlocked 
                      ? 'bg-accent-visited/5 border-accent-visited/30 shadow-[0_2px_12px_-4px_rgba(158,206,106,0.15)]' 
                      : 'bg-base-200/5 border-base-300/30 border-dashed opacity-55'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                    ${ach.unlocked 
                      ? 'bg-accent-visited/10 text-accent-visited' 
                      : 'bg-base-300/30 text-base-content/30'}`}
                  >
                    <IconComp size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-[12px] font-extrabold truncate leading-tight ${ach.unlocked ? 'text-base-content' : 'text-base-content/50'}`}>
                      {ach.title}
                    </span>
                    <span className="text-[9px] text-base-content/40 font-medium truncate mt-0.5">
                      {ach.desc}
                    </span>
                  </div>
                  <div className="text-right shrink-0 flex flex-col justify-center items-end">
                    {ach.unlocked ? (
                      <CheckCircle2 size={13} className="text-accent-visited" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <Lock size={9} className="text-base-content/30" />
                        <span className="text-[8px] font-mono text-base-content/30 font-bold">{ach.progress}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
