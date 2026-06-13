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
      .sort((a, b) => b.total - a.total); // Sort by continent logical size

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
    <div className="page-container page-transition">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PieIcon size={24} color="var(--accent-primary)" />
        <h2>Analytics Dashboard</h2>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card">
          <Globe size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
          <h3 className="kpi-card-title">{percentVisited}%</h3>
          <p style={{ color: 'var(--text-secondary)' }}>of {totalCountries} independent countries visited</p>
        </div>
        
        <div className="glass-panel kpi-card">
          <Award size={48} color="var(--accent-visited)" style={{ marginBottom: '1rem' }} />
          <h3 className="kpi-card-persona">{mostExplored}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Traveler Persona</p>
        </div>
        
        <div className="glass-panel kpi-card--flex">
          <div className="kpi-stat-sub">
            <h4 className="kpi-stat-value kpi-stat-value--visited">{stats.visited}</h4>
            <p className="kpi-stat-label">Visited</p>
          </div>
          <div className="kpi-stat-divider"></div>
          <div className="kpi-stat-sub">
            <h4 className="kpi-stat-value kpi-stat-value--revisit">{stats.revisit}</h4>
            <p className="kpi-stat-label">Revisit</p>
          </div>
          <div className="kpi-stat-divider"></div>
          <div className="kpi-stat-sub">
            <h4 className="kpi-stat-value kpi-stat-value--wishlist">{stats.wishlist}</h4>
            <p className="kpi-stat-label">Wishlist</p>
          </div>
        </div>
      </div>

      {/* Global Charts Row */}
      <div className="analytics-charts-container">
        <div className="glass-panel chart-panel">
          <h3 className="chart-panel-title">
            <TrendingUp size={20} />
            Global Coverage Breakdown
          </h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--glass-bg)', 
                    borderColor: 'var(--glass-border)', 
                    borderRadius: '8px', 
                    backdropFilter: 'blur(10px)' 
                  }} 
                  itemStyle={{ color: 'var(--text-primary)' }} 
                  labelStyle={{ color: 'var(--text-primary)' }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{value}</span>} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Continental Breakdown Grid */}
      <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MapIcon size={24} />
        Coverage by Continent
      </h3>
      <div className="continental-grid">
        {continentPies.map((cont) => {
          const totalVisitedInContinent = cont.visited + cont.revisit;
          const percent = cont.total > 0 ? Math.round((totalVisitedInContinent / cont.total) * 100) : 0;
          return (
            <div key={cont.name} className="glass-panel continent-card">
              <div className="continent-card-header">
                <h4 className="continent-card-title">{cont.name}</h4>
                <div className="continent-card-stats">
                  <span className="continent-card-percent">{percent}%</span>
                  <div className="continent-card-count">
                    {totalVisitedInContinent} / {cont.total} visited
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cont.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                      {cont.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Analytics;
