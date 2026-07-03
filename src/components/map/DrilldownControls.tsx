import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { DrilldownConfig } from '../../config/drilldownConfig';

interface DrilldownControlsProps {
  config: DrilldownConfig;
  setSubRegionCenter: (center: [number, number]) => void;
  setSubRegionZoom: (zoom: number) => void;
}

export const DrilldownControls: React.FC<DrilldownControlsProps> = ({
  config,
  setSubRegionCenter,
  setSubRegionZoom
}) => {
  return (
    <button 
      onClick={() => {
        setSubRegionCenter(config.defaultView.center);
        setSubRegionZoom(config.defaultView.zoom);
      }}
      className="map-reset-zoom"
      title="Reset Map Zoom"
    >
      <RefreshCw size={12} />
      <span>Reset Zoom</span>
    </button>
  );
};
