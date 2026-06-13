import React from 'react';
import { RefreshCw } from 'lucide-react';
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
  setSubRegionCenter,
  setSubRegionZoom
}) => {
  return (
    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50 }}>
      <button 
        onClick={() => {
            setSubRegionCenter(config.defaultView.center);
            setSubRegionZoom(config.defaultView.zoom);
        }}
        className="glass-button"
        title="Reset Map Zoom"
      >
          <RefreshCw size={14} /> Reset Zoom
      </button>
    </div>
  );
};
