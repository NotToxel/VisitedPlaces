import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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

  const { stats, continentData, mostExplored } = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    
    const continentCounts: Record<string, { visited: number, wishlist: number, total: number }> = {};
    
    // Initialize continents
    Object.values(countryContinents).forEach(cont => {
      if (!continentCounts[cont]) continentCounts[cont] = { visited: 0, wishlist: 0, total: 0 };
      continentCounts[cont].total++;
    });

    Object.entries(countryContinents).forEach(([cca3, continent]) => {
      const place = places[cca3];
      if (place) {
          if (place.status === 'VISITED') {
             visited++;
             if (continentCounts[continent]) continentCounts[continent].visited++;
          }
          if (place.status === 'WISHLIST') {
             wishlist++;
             if (continentCounts[continent]) continentCounts[continent].wishlist++;
          }
      }
    });

    const unselected = totalCountries - visited - wishlist;
    
    // Format data for BarChart
    const contDataArray = Object.entries(continentCounts)
      .filter(([name]) => name !== 'Other')
      .map(([name, data]) => ({
        name,
        Visited: data.visited,
        Wishlist: data.wishlist,
        Unexplored: data.total - data.visited - data.wishlist
      }))
      .sort((a, b) => b.Visited - a.Visited); // Sort by most visited
      
    // Find Most Explored
    let maxVisited = 0;
    let mostExploredName = 'Rookie Explorer';
    contDataArray.forEach(cont => {
        if (cont.Visited > maxVisited) {
            maxVisited = cont.Visited;
            mostExploredName = `${cont.name} Expert`;
        }
    });
    if (visited === 0) mostExploredName = "Armchair Traveler";
    else if (visited > 50) mostExploredName = "Globe Trotter";

    return { 
        stats: { visited, wishlist, unselected }, 
        continentData: contDataArray,
        mostExplored: mostExploredName
    };
  }, [places, totalCountries, countryContinents]);

  const pieData = [
    { name: 'Visited', value: stats.visited, color: 'var(--accent-visited)' },
    { name: 'Wishlist', value: stats.wishlist, color: 'var(--accent-wishlist)' },
    { name: 'Unexplored', value: stats.unselected > 0 ? stats.unselected : 0, color: 'rgba(255,255,255,0.1)' },
  ];

  const percentVisited = totalCountries > 0 ? ((stats.visited / totalCountries) * 100).toFixed(1) : '0';

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PieIcon size={24} color="var(--accent-primary)" />
        <h2>Analytics Dashboard</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
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
            <div>
              <h4 style={{ fontSize: '2rem', color: 'var(--accent-visited)', margin: 0 }}>{stats.visited}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Countries Visited</p>
            </div>
            <div style={{ width: '1px', height: '100%', background: 'var(--glass-border)' }}></div>
            <div>
              <h4 style={{ fontSize: '2rem', color: 'var(--accent-wishlist)', margin: 0 }}>{stats.wishlist}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Countries on Wishlist</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

        {/* Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} />
            World Coverage Breakdown
          </h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon size={20} />
            Exploration by Continent
          </h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={continentData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Visited" stackId="a" fill="var(--accent-visited)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Wishlist" stackId="a" fill="var(--accent-wishlist)" />
                <Bar dataKey="Unexplored" stackId="a" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
