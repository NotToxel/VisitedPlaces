import React from 'react';
import { ArrowLeft, Map as MapIcon, List } from 'lucide-react';
import type { DrilldownConfig } from '../../config/drilldownConfig';

interface DrilldownControlsProps {
  activeCountry: string;
  config: DrilldownConfig;
  showTerritories: boolean;
  setShowTerritories: (show: boolean) => void;
  setActiveCountry: (id: string | null) => void;
  setSubRegionCenter: (center: [number, number]) => void;
  setSubRegionZoom: (zoom: number) => void;
}

export const DrilldownControls: React.FC<DrilldownControlsProps> = ({
  config,
  showTerritories,
  setShowTerritories,
  setActiveCountry,
  setSubRegionCenter,
  setSubRegionZoom
}) => {
  return (
    <>
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 50, display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => setActiveCountry(null)}
          className="glass-button"
        >
            <ArrowLeft size={16} /> Back to World
        </button>
        <button 
          onClick={() => {
              setSubRegionCenter(config.defaultView.center);
              setSubRegionZoom(config.defaultView.zoom);
          }}
          className="glass-button"
        >
            <MapIcon size={16} /> Reset Zoom
        </button>
      </div>
      
      {config.territories && !showTerritories && (
        <button
          onClick={() => setShowTerritories(true)}
          className="glass-button"
          style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 40, padding: '0.6rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          <List size={18} /> {config.territoryLabel || 'Territories'}
        </button>
      )}
    </>
  );
};
