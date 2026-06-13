import { UK_TERRITORIES, USA_TERRITORIES, OBSOLETE_UK_REGIONS } from '../data/mapData';
import type { MapMarker } from '../data/mapData';

export interface TopologyGeometry {
  type: string;
  id: string | number;
  properties?: Record<string, string | number | boolean>;
  arcs?: unknown[];
}

export interface TopologyObject {
  type: string;
  geometries: TopologyGeometry[];
}

export interface TopologyData {
  type: string;
  objects: Record<string, TopologyObject>;
  arcs?: unknown[];
  transform?: unknown;
}

export interface DrilldownConfig {
  id: string; // e.g., 'USA', 'GBR'
  projection: 'geoAlbersUsa' | 'geoMercator';
  scale: number;
  center?: [number, number]; // Global projection center
  defaultView: { center: [number, number]; zoom: number }; // Reset zoom values for the sub-region window
  territories?: MapMarker[];
  territoryLabel?: string;
  processTopology?: (data: TopologyData) => TopologyData; // Generic hook to filter obsolete regions or unsupported geometries out of the TopoJSON
}

export const drilldownRegistry: Record<string, DrilldownConfig> = {
  'GBR': {
    id: 'GBR',
    projection: 'geoMercator',
    scale: 3200,
    center: [-2, 54.5], // Render centering override
    defaultView: { center: [-3, 54.5], zoom: 0.6 },
    territories: UK_TERRITORIES,
    territoryLabel: 'Crown Dependencies & Overseas Territories',
    processTopology: (data: TopologyData) => {
      if (data.objects && data.objects.utla) {
        data.objects.utla.geometries = data.objects.utla.geometries.filter((g: TopologyGeometry) => {
          const id = (g.properties?.AREACD || g.properties?.areacd || g.id || '').toString();
          return !OBSOLETE_UK_REGIONS.has(id);
        });
        // Normalize the active object layer to 'default' so the map loop can easily target it
        data.objects = { default: data.objects.utla };
      }
      return data;
    }
  },
  'USA': {
    id: 'USA',
    projection: 'geoAlbersUsa',
    scale: 800,
    defaultView: { center: [-97, 38], zoom: 1 },
    territories: USA_TERRITORIES,
    territoryLabel: 'US Territories',
    processTopology: (data: TopologyData) => {
      if (data.objects && data.objects.states) {
        // geoAlbersUsa mathematically blows up if we feed it geometries outside its programmed bounding boxes
        // (Guam, American Samoa, Northern Marianas, US Virgin Islands). Puerto Rico (72) is safe in modern D3.
        const unsupportedIds = new Set(['66', '60', '69', '78']);
        data.objects.states.geometries = data.objects.states.geometries.filter((g: TopologyGeometry) => 
          g.id !== undefined && !unsupportedIds.has(g.id.toString())
        );
        data.objects = { default: data.objects.states };
      }
      return data;
    }
  }
};
