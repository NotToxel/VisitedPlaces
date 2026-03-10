import React, { useState, useEffect } from 'react';
import { REST_COUNTRIES_URL } from '../../config/constants';
import { StandardMap } from './StandardMap';
import { HexagonMap } from './HexagonMap';
import { Eye, EyeOff } from 'lucide-react';

export const MapContainer: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'VISITED' | 'WISHLIST' | 'AVOID'>('VISITED');
  const [mapStyle, setMapStyle] = useState<'STANDARD' | 'HEXAGON'>('STANDARD');
  const [showHexLabels, setShowHexLabels] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  // Search/Highlight feature
  const [countries, setCountries] = useState<{cca2: string, cca3: string, name: string}[]>([]);
  const [numericToA3, setNumericToA3] = useState<Record<string, string>>({});
  const [searchVal, setSearchVal] = useState('');
  const [highlightedCountryA3, setHighlightedCountryA3] = useState<string | null>(null);

  // Visibility toggles for each status
  const [showVisited, setShowVisited] = useState(true);
  const [showWishlist, setShowWishlist] = useState(true);
  const [showAvoid, setShowAvoid] = useState(true);

  useEffect(() => {
    fetch(`${REST_COUNTRIES_URL},independent`)
      .then(res => res.json())
      .then((data: any[]) => {
        const filtered = data.filter(c => c.independent === true || c.cca3 === 'TWN' || c.cca3 === 'HKG' || c.cca3 === 'MAC')
          .map(c => ({ cca2: c.cca2, cca3: c.cca3, name: c.name.common }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(filtered);
        
        const ccnMap: Record<string, string> = {};
        data.forEach(c => {
           if (c.ccn3 && c.cca3) {
             ccnMap[c.ccn3] = c.cca3; // "840" -> "USA"
           }
        });
        setNumericToA3(ccnMap);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    const found = countries.find(c => c.name.toLowerCase() === val.toLowerCase());
    setHighlightedCountryA3(found ? found.cca3 : null);
  };

  return (
    <div className="map-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      {/* Map Header / Controls */}
      <div className="map-controls-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowX: 'auto', maxWidth: '100%' }}>
          <div className="map-controls-group">
          <button 
            className={`glass-button ${activeMode === 'VISITED' ? 'glass-button--primary' : ''}`}
            onClick={() => setActiveMode('VISITED')}
            style={{ 
              borderColor: activeMode === 'VISITED' ? 'var(--accent-visited)' : 'transparent', 
              color: activeMode === 'VISITED' ? 'var(--accent-visited)' : '' 
            }}
          >
            Mark Visited
          </button>
          <button 
            className={`glass-button ${activeMode === 'WISHLIST' ? 'glass-button--primary' : ''}`}
            onClick={() => setActiveMode('WISHLIST')}
            style={{ 
              borderColor: activeMode === 'WISHLIST' ? 'var(--accent-wishlist)' : 'transparent', 
              color: activeMode === 'WISHLIST' ? 'var(--accent-wishlist)' : '' 
            }}
          >
            Mark Wishlist
          </button>
          <button 
            className={`glass-button ${activeMode === 'AVOID' ? 'glass-button--primary' : ''}`}
            onClick={() => setActiveMode('AVOID')}
            style={{ 
              borderColor: activeMode === 'AVOID' ? 'var(--color-avoid)' : 'transparent', 
              color: activeMode === 'AVOID' ? 'var(--color-avoid)' : '' 
            }}
          >
            Mark Avoid
          </button>
          </div>
        </div>
        
        <div className="map-controls-group">
          {(
            [['VISITED', showVisited, setShowVisited, 'var(--accent-visited)'],
             ['WISHLIST', showWishlist, setShowWishlist, 'var(--accent-wishlist)'],
             ['AVOID', showAvoid, setShowAvoid, 'var(--color-avoid)']] as const
          ).map(([label, shown, setter, color]) => (
            <button
              key={label}
              className="glass-button"
              onClick={() => setter(!shown)}
              title={`${shown ? 'Hide' : 'Show'} ${label}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: shown ? 1 : 0.45, borderColor: shown ? color : 'transparent', color: shown ? color : 'var(--text-muted)', whiteSpace: 'nowrap' }}
            >
              {shown ? <Eye size={14} /> : <EyeOff size={14} />}
              {label.charAt(0) + label.slice(1).toLowerCase()}
            </button>
          ))}
          <input 
             type="text"
             className="glass-input" 
             placeholder="Find Country..."
             value={searchVal} 
             onChange={handleSearchChange}
             list="country-search-list"
             style={{ padding: '0.5rem', borderRadius: '4px', width: '200px', flexShrink: 0 }}
          />
          <datalist id="country-search-list">
             {countries.map(c => (
                <option key={c.cca2} value={c.name} />
             ))}
          </datalist>

          {mapStyle === 'HEXAGON' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={showHexLabels} onChange={e => setShowHexLabels(e.target.checked)} />
              Labels
            </label>
          )}

          <button 
            className={`glass-button ${mapStyle === 'STANDARD' ? 'glass-button--primary' : ''}`}
            onClick={() => setMapStyle('STANDARD')}
            style={{ whiteSpace: 'nowrap' }}
          >
            Standard Map
          </button>
          <button 
            className={`glass-button ${mapStyle === 'HEXAGON' ? 'glass-button--primary' : ''}`}
            onClick={() => setMapStyle('HEXAGON')}
            style={{ whiteSpace: 'nowrap' }}
          >
            Hexagon Map
          </button>
        </div>
      </div>

      {/* Map Rendering Area */}
      <div className="glass-panel" style={{ flex: 1, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
        {mapStyle === 'STANDARD' ? (
          <StandardMap 
            selectionMode={activeMode} 
            setTooltipContent={setTooltipContent} 
            activeCountry={activeCountry}
            setActiveCountry={setActiveCountry}
            highlightedCountry={highlightedCountryA3}
            numericToA3={numericToA3}
            showVisited={showVisited}
            showWishlist={showWishlist}
            showAvoid={showAvoid}
          />
        ) : (
          <HexagonMap 
            selectionMode={activeMode} 
            setTooltipContent={setTooltipContent}
            highlightedCountry={highlightedCountryA3}
            showLabels={showHexLabels}
          />
        )}
        
        {/* Simple Tooltip */}
        {tooltipContent && (
          <div style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--glass-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--glass-border)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '1rem',
            pointerEvents: 'none',
            zIndex: 100,
            fontWeight: 500,
          }}>
            {tooltipContent}
          </div>
        )}
      </div>
    </div>
  );
};
