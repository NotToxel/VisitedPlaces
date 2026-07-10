import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { DrilldownConfig } from '../../config/drilldownConfig';

interface DrilldownControlsProps {
  config?: DrilldownConfig | null;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  setSubRegionCenter: (center: [number, number]) => void;
  setSubRegionZoom: (zoom: number) => void;
}

export const DrilldownControls: React.FC<DrilldownControlsProps> = ({
  config,
  defaultCenter,
  defaultZoom,
  setSubRegionCenter,
  setSubRegionZoom
}) => {
  const center = config?.defaultView.center || defaultCenter || [0, 20];
  const zoom = config?.defaultView.zoom || defaultZoom || 1;

  return (
    <button 
      onClick={() => {
        setSubRegionCenter(center);
        setSubRegionZoom(zoom);
      }}
      className="map-reset-zoom"
      title="Reset Map Zoom"
    >
      <RefreshCw size={12} />
      <span>Reset Zoom</span>
    </button>
  );
};
