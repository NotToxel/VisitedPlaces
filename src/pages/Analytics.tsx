import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon, TrendingUp, Globe } from 'lucide-react';

const Analytics: React.FC = () => {
  const { places } = useStore();
  const [totalCountries, setTotalCountries] = useState(195); // Default fallback

  useEffect(() => {
    fetch('/src/assets/features.json')
      .then(res => res.json())
      .then(topo => {
        const objectKey = Object.keys(topo.objects)[0];
        const geometries = topo.objects[objectKey].geometries;
        let count = 0;
        const seen = new Set();
        geometries.forEach((g: any) => {
          const id = g.id || g.properties?.ISO_A3;
          if (id && !seen.has(id)) {
            seen.add(id);
            count++;
          }
        });
        if (count > 0) setTotalCountries(count);
      })
      .catch(err => console.error("Could not load topo data", err));
  }, []);

  const stats = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    Object.values(places).forEach(place => {
      if (place.status === 'VISITED') visited++;
      if (place.status === 'WISHLIST') wishlist++;
    });
    const unselected = totalCountries - visited - wishlist;
    return { visited, wishlist, unselected };
  }, [places, totalCountries]);

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
        {/* KPI Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <Globe size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '3rem', margin: 0 }}>{percentVisited}%</h3>
            <p style={{ color: 'var(--text-secondary)' }}>of the world visited</p>
          </div>
          
          <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
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
    </div>
  );
};

export default Analytics;
