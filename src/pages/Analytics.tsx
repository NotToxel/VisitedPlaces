import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { COUNTRIES } from '../data/countries';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon, TrendingUp, Globe, Map as MapIcon, Award } from 'lucide-react';

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

  const { stats, continentPies, mostExplored } = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    let revisit = 0;
    
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
        }
      }
    });

    const unselected = totalCountries - visited - wishlist - revisit;

    // Build array of continent-specific pie data
    const continentPies = Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other' && name !== 'Antarctica')
      .map(([name, data]) => {
        const unexplored = data.total - data.visited - data.wishlist - data.revisit;
        return {
          name,
          total: data.total,
          visited: data.visited,
          revisit: data.revisit,
          pieData: [
            { name: 'Visited', value: data.visited, color: 'var(--accent-visited)' },
            { name: 'Revisit', value: data.revisit, color: 'var(--accent-revisit)' },
            { name: 'Wishlist', value: data.wishlist, color: 'var(--accent-wishlist)' },
            { name: 'Unexplored', value: unexplored > 0 ? unexplored : 0, color: 'var(--map-fill-hover)' }
          ]
        };
      })
      .sort((a, b) => b.total - a.total); 

    const totalExplored = visited + revisit;
    const visData = Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other')
      .map(([name, data]) => ({ name, value: data.visited + data.revisit }))
      .filter(d => d.value > 0);
      
    let maxVisited = 0;
    let mostExploredName = 'Rookie Explorer';
    visData.forEach(cont => {
      if (cont.value > maxVisited) {
        maxVisited = cont.value;
        mostExploredName = `${cont.name} Expert`;
      }
    });
    if (totalExplored === 0) mostExploredName = "Armchair Traveler";
    else if (totalExplored > 50) mostExploredName = "Globe Trotter";

    return { 
      stats: { visited, wishlist, revisit, unselected }, 
      continentPies,
      mostExplored: mostExploredName
    };
  }, [places, totalCountries, countryContinents]);

  const pieData = [
    { name: 'Visited', value: stats.visited, color: 'var(--accent-visited)' },
    { name: 'Revisit', value: stats.revisit, color: 'var(--accent-revisit)' },
    { name: 'Wishlist', value: stats.wishlist, color: 'var(--accent-wishlist)' },
    { name: 'Unexplored', value: stats.unselected > 0 ? stats.unselected : 0, color: 'var(--map-fill-hover)' },
  ];

  const totalVisitedAndRevisit = stats.visited + stats.revisit;
  const percentVisited = totalCountries > 0 ? ((totalVisitedAndRevisit / totalCountries) * 100).toFixed(1) : '0';

  return (
    <div className="p-3 md:p-6 h-full flex flex-col gap-4 overflow-hidden bg-transparent max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="glass-panel border border-base-300/50 p-4 rounded-2xl shrink-0 flex items-center gap-2 select-none">
        <PieIcon size={18} className="text-primary" />
        <h2 className="font-bold text-sm text-base-content">Analytics Dashboard</h2>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
        {/* KPI Dashboard Row */}
        <div className="stats stats-vertical md:stats-horizontal shadow border border-base-300/40 rounded-2xl bg-base-200/20 backdrop-blur-md shrink-0 select-none w-full">
          <div className="stat py-3">
            <div className="stat-figure text-primary">
              <Globe className="w-7 h-7" />
            </div>
            <div className="stat-title text-[10px] font-bold text-base-content/50 uppercase tracking-wide">Total Coverage</div>
            <div className="stat-value text-primary text-2xl mt-0.5">{percentVisited}%</div>
            <div className="stat-desc text-[10px] mt-0.5 text-base-content/60">of {totalCountries} countries visited</div>
          </div>
          
          <div className="stat py-3 border-t md:border-t-0 md:border-l border-base-300/50">
            <div className="stat-figure text-success">
              <Award className="w-7 h-7 text-accent-visited" />
            </div>
            <div className="stat-title text-[10px] font-bold text-base-content/50 uppercase tracking-wide">Traveler Persona</div>
            <div className="stat-value text-accent-visited text-md truncate mt-1.5 font-bold" title={mostExplored}>{mostExplored}</div>
            <div className="stat-desc text-[10px] mt-0.5 text-base-content/60">Unlocked ranking profile</div>
          </div>
          
          <div className="stat py-3 border-t md:border-t-0 md:border-l border-base-300/50 grid grid-cols-3 items-center text-center px-2 sm:px-4 gap-1">
            <div className="border-r border-base-300/50 py-1">
              <div className="text-[10px] font-semibold text-base-content/60 uppercase">Visited</div>
              <div className="text-lg font-extrabold text-accent-visited mt-0.5">{stats.visited}</div>
            </div>
            <div className="border-r border-base-300/50 py-1">
              <div className="text-[10px] font-semibold text-base-content/60 uppercase">Revisit</div>
              <div className="text-lg font-extrabold text-accent-revisit mt-0.5">{stats.revisit}</div>
            </div>
            <div className="py-1">
              <div className="text-[10px] font-semibold text-base-content/60 uppercase">Wishlist</div>
              <div className="text-lg font-extrabold text-accent-wishlist mt-0.5">{stats.wishlist}</div>
            </div>
          </div>
        </div>

        {/* Global Charts Row */}
        <div className="card card-compact bg-base-200/20 border border-base-300/40 rounded-2xl shadow-sm p-4 flex flex-col gap-3 h-80 select-none shrink-0">
          <h3 className="flex items-center gap-2 font-bold text-xs text-base-content uppercase tracking-wider">
            <TrendingUp size={14} className="text-primary" />
            Global Coverage Breakdown
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--glass-bg)', 
                    borderColor: 'var(--glass-border)', 
                    borderRadius: '10px', 
                    backdropFilter: 'blur(10px)' 
                  }} 
                  itemStyle={{ color: 'var(--text-primary)', fontSize: '0.75rem' }} 
                  labelStyle={{ color: 'var(--text-primary)', fontSize: '0.75rem' }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={30} 
                  formatter={(value) => <span className="text-base-content/80 text-xs font-semibold select-none">{value}</span>} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Continental Breakdown Grid */}
        <div className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-1.5 font-bold text-xs text-base-content uppercase tracking-wider mt-1.5">
            <MapIcon size={16} className="text-primary" />
            Coverage by Continent
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 select-none">
            {continentPies.map((cont) => {
              const totalVisitedInContinent = cont.visited + cont.revisit;
              const percent = cont.total > 0 ? Math.round((totalVisitedInContinent / cont.total) * 100) : 0;
              return (
                <div key={cont.name} className="card card-compact bg-base-200/20 border border-base-300/40 rounded-xl shadow-sm p-4 flex flex-col gap-3 h-64 relative">
                  <div className="flex justify-between items-start border-b border-base-300/30 pb-2">
                    <h4 className="font-bold text-xs text-base-content">{cont.name}</h4>
                    <div className="text-right flex flex-col">
                      <span className="font-extrabold text-xs text-primary">{percent}%</span>
                      <div className="text-[9px] opacity-50 mt-0.5">
                        {totalVisitedInContinent} / {cont.total} visited
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cont.pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                          {cont.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', borderRadius: '10px' }} 
                          itemStyle={{ color: 'var(--text-primary)', fontSize: '0.7rem' }} 
                          labelStyle={{ color: 'var(--text-primary)', fontSize: '0.7rem' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
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
