import React, { memo } from 'react';
import { X as XIcon, Check, Heart, Ban } from 'lucide-react';
import type { MapMarker } from '../../data/mapData';
import type { PlaceStatus } from '../../store/useStore';

interface TerritoryListPanelProps {
  title: string;
  territories: MapMarker[];
  places: Record<string, { status: PlaceStatus }>;
  setCountryStatus: (id: string, status: PlaceStatus) => void;
  onClose: () => void;
  getFillColor: (status: PlaceStatus, isHighlighted: boolean, isSubRegion: boolean) => string;
}

export const TerritoryListPanel: React.FC<TerritoryListPanelProps> = memo(({
  title,
  territories,
  places,
  setCountryStatus,
  onClose,
  getFillColor
}) => {
  return (
    <div className="glass-panel" style={{
      position: 'absolute', top: '1rem', right: '1rem', 
      width: 'min(380px, calc(100vw - 2rem))', 
      maxHeight: 'calc(100% - 2rem)', zIndex: 40,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'slideInRight 0.3s ease-out forwards'
    }}>
      <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--map-fill-unselected)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h3>
        <button 
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
        >
          <XIcon size={18} />
        </button>
      </div>
      <div style={{ 
        flex: 1, overflowY: 'auto', padding: '0.5rem',
        display: 'flex', flexDirection: 'column',
        gap: '0.5rem', alignContent: 'start'
      }}>
        {territories.map((territory) => {
          const status = places[territory.id]?.status || 'NONE';
          return (
            <div key={territory.id} className="glass-panel" style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
              borderStyle: 'solid', borderWidth: '1px',
              transition: 'transform 0.2s, border-color 0.2s, background-color 0.2s',
              borderColor: status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : status === 'AVOID' ? '#ef4444' : 'var(--glass-border)',
              background: status !== 'NONE' ? (status === 'VISITED' ? 'rgba(34,197,94,0.05)' : status === 'WISHLIST' ? 'rgba(187,154,247,0.05)' : 'rgba(239,68,68,0.05)') : 'rgba(255,255,255,0.02)'
            }}>
              {territory.flagCode ? (
                <img 
                  src={`https://flagcdn.com/24x18/${territory.flagCode}.png`} 
                  alt={`${territory.name} flag`}
                  style={{ width: '24px', height: '18px', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}
                />
              ) : (
                }} />
              )}
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {territory.name}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  title="Mark Visited"
                  onClick={() => setCountryStatus(territory.id, status === 'VISITED' ? 'NONE' : 'VISITED')}
                  style={{ 
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
                    background: status === 'VISITED' ? 'var(--accent-visited)' : 'var(--glass-bg)',
                    color: status === 'VISITED' ? '#0b0c14' : 'var(--text-muted)',
                    transition: 'all 0.2s', padding: 0
                  }}
                ><Check size={16} strokeWidth={status === 'VISITED' ? 3 : 2} /></button>
                <button 
                  title="Mark Wishlist"
                  onClick={() => setCountryStatus(territory.id, status === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                  style={{ 
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
                    background: status === 'WISHLIST' ? 'var(--accent-wishlist)' : 'var(--glass-bg)',
                    color: status === 'WISHLIST' ? '#0b0c14' : 'var(--text-muted)',
                    transition: 'all 0.2s', padding: 0
                  }}
                ><Heart size={16} strokeWidth={status === 'WISHLIST' ? 3 : 2} /></button>
                <button 
                  title="Mark Avoid"
                  onClick={() => setCountryStatus(territory.id, status === 'AVOID' ? 'NONE' : 'AVOID')}
                  style={{ 
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
                    background: status === 'AVOID' ? '#ef4444' : 'var(--glass-bg)',
                    color: status === 'AVOID' ? '#0b0c14' : 'var(--text-muted)',
                    transition: 'all 0.2s', padding: 0
                  }}
                ><Ban size={16} strokeWidth={status === 'AVOID' ? 3 : 2} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
