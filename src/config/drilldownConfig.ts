// Drill-down configuration for countries with curated, high-quality TopoJSON sources.
// Countries NOT in this registry use the Natural Earth admin-1 baseline.
// Territories are now handled by territoriesRegistry.ts, not here.


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

export const drilldownRegistry: Record<string, DrilldownConfig> = {};
