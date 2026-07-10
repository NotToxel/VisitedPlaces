// Drill-down configuration for countries with curated, high-quality TopoJSON sources.
// Countries NOT in this registry use the Natural Earth admin-1 baseline.
// Territories are now handled by territoriesRegistry.ts, not here.

import { OBSOLETE_UK_REGIONS } from '../data/mapData';

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
  id: string;                       // ISO-A3 code
  topoJsonUrl: string;              // CDN URL for this country's curated TopoJSON
  scale: number;                    // Projection scale
  center?: [number, number];        // Projection center override
  defaultView: { center: [number, number]; zoom: number };
  processTopology?: (data: TopologyData) => TopologyData;
  /** Extract the canonical region ID from a geometry. Returns the ISO 3166-2 portion. */
  regionIdExtractor?: (geometry: TopologyGeometry) => string;
}

export const drilldownRegistry: Record<string, DrilldownConfig> = {
  'GBR': {
    id: 'GBR',
    topoJsonUrl: 'https://cdn.jsdelivr.net/gh/ONSdigital/uk-topojson@master/output/topo.json',
    scale: 3200,
    center: [-2, 54.5],
    defaultView: { center: [-3, 54.5], zoom: 0.6 },
    regionIdExtractor: (g) => {
      const rawId = (g.properties?.AREACD || g.properties?.areacd || g.id || '').toString();
      return rawId;
    },
    processTopology: (data: TopologyData) => {
      if (data.objects?.utla) {
        data.objects.utla.geometries = data.objects.utla.geometries.filter((g: TopologyGeometry) => {
          const id = (g.properties?.AREACD || g.properties?.areacd || g.id || '').toString();
          return !OBSOLETE_UK_REGIONS.has(id);
        });
        data.objects = { default: data.objects.utla };
      }
      return data;
    }
  },
  'USA': {
    id: 'USA',
    topoJsonUrl: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
    scale: 800,
    defaultView: { center: [-97, 38], zoom: 1 },
    regionIdExtractor: (g) => {
      return (g.id?.toString() || '');
    },
    processTopology: (data: TopologyData) => {
      if (data.objects?.states) {
        // Filter territories that break geoMercator (though we now use geoMercator
        // globally, these very small island geometries still aren't useful on the map)
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
