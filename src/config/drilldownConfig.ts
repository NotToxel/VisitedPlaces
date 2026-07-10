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

const slugify = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const drilldownRegistry: Record<string, DrilldownConfig> = {
  'SGP': {
    id: 'SGP',
    topoJsonUrl: 'https://raw.githubusercontent.com/yinshanyang/singapore/master/maps/2-planning-area.geojson',
    scale: 110000,
    center: [103.82, 1.352],
    defaultView: { center: [103.82, 1.352], zoom: 1 },
    regionIdExtractor: (f) => {
      const name = (f.properties?.name || f.properties?.NAME || '').toString();
      return slugify(name);
    }
  }
};
