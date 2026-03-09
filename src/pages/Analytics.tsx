import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon, TrendingUp, Globe, Map as MapIcon, Award } from 'lucide-react';

const Analytics: React.FC = () => {
  const { places } = useStore();
  const [totalCountries, setTotalCountries] = useState(195);
  const [countryContinents, setCountryContinents] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=cca3,continents,independent')
      .then(res => res.json())
      .then((data: any[]) => {
        const independent = data.filter(c => c.independent === true);
        setTotalCountries(independent.length);
        
        const map: Record<string, string> = {};
        independent.forEach(c => {
          map[c.cca3] = c.continents?.[0] || 'Other';
        });
        setCountryContinents(map);
      })
      .catch(err => console.error("Could not load country data", err));
  }, []);

  const { stats, continentPies, mostExplored } = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    
    const continentCounts: Record<string, { visited: number, wishlist: number, total: number }> = {};
    
    Object.values(countryContinents).forEach(cont => {
      if (!continentCounts[cont]) continentCounts[cont] = { visited: 0, wishlist: 0, total: 0 };
      continentCounts[cont].total++;
    });

    Object.entries(countryContinents).forEach(([cca3, continent]) => {
      const place = places[cca3];
      if (place) {
          if (place.status === 'VISITED') {
             visited++;
             continentCounts[continent].visited++;
          }
          if (place.status === 'WISHLIST') {
             wishlist++;
             continentCounts[continent].wishlist++;
          }
      }
    });

    const unselected = totalCountries - visited - wishlist;

    // Build array of continent-specific pie data
    const continentPies = Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other' && name !== 'Antarctica')
      .map(([name, data]) => {
         const unexplored = data.total - data.visited - data.wishlist;
         return {
           name,
           total: data.total,
           visited: data.visited,
           pieData: [
             { name: 'Visited', value: data.visited, color: 'var(--accent-visited)' },
             { name: 'Wishlist', value: data.wishlist, color: 'var(--accent-wishlist)' },
             { name: 'Unexplored', value: unexplored > 0 ? unexplored : 0, color: 'var(--map-fill-hover)' }
           ]
         };
      })
      .sort((a, b) => b.total - a.total); // Sort by continent logical size

    const visData = Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other')
      .map(([name, data]) => ({ name, value: data.visited }))
      .filter(d => d.value > 0);
      
    let maxVisited = 0;
    let mostExploredName = 'Rookie Explorer';
    visData.forEach(cont => {
        if (cont.value > maxVisited) {
            maxVisited = cont.value;
            mostExploredName = `${cont.name} Expert`;
        }
    });
    if (visited === 0) mostExploredName = "Armchair Traveler";
    else if (visited > 50) mostExploredName = "Globe Trotter";

    return { 
        stats: { visited, wishlist, unselected }, 
        continentPies,
        mostExplored: mostExploredName
    };
  }, [places, totalCountries, countryContinents]);

  const pieData = [
    { name: 'Visited', value: stats.visited, color: 'var(--accent-visited)' },
    { name: 'Wishlist', value: stats.wishlist, color: 'var(--accent-wishlist)' },
    { name: 'Unexplored', value: stats.unselected > 0 ? stats.unselected : 0, color: 'var(--map-fill-hover)' },
  ];

  const percentVisited = totalCountries > 0 ? ((stats.visited / totalCountries) * 100).toFixed(1) : '0';

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PieIcon size={24} color="var(--accent-primary)" />
        <h2>Analytics Dashboard</h2>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <Globe size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '3rem', margin: 0 }}>{percentVisited}%</h3>
          <p style={{ color: 'var(--text-secondary)' }}>of {totalCountries} independent countries visited</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <Award size={48} color="var(--accent-visited)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>{mostExplored}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Traveler Persona</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '2.5rem', color: 'var(--accent-visited)', margin: 0 }}>{stats.visited}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Countries Visited</p>
          </div>
          <div style={{ width: '1px', height: '80%', background: 'var(--glass-border)' }}></div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '2.5rem', color: 'var(--accent-wishlist)', margin: 0 }}>{stats.wishlist}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Countries on Wishlist</p>
          </div>
        </div>
      </div>

      {/* Global Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} />
            Global Coverage Breakdown
          </h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(10px)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{value}</span>} />
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', flex: 1, paddingBottom: '2rem' }}>
        {continentPies.map((cont: any) => {
          const percent = cont.total > 0 ? Math.round((cont.visited / cont.total) * 100) : 0;
          return (
            <div key={cont.name} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{cont.name}</h4>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-visited)' }}>{percent}%</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cont.visited} / {cont.total} visited</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cont.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                      {cont.pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
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
