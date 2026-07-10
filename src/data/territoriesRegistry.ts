// Data-driven registry of overseas territories and their parent countries.
// Decoupled from drilldown config so territories appear regardless of whether
// a drill-down map exists for the parent country.

export interface Territory {
  id: string;               // Canonical store key (e.g., "GBR-GI", "FRA-GP")
  name: string;             // Human-readable name
  parent: string;           // Parent country ISO-A3
  coordinates: [number, number];
  flagCode: string;         // ISO-A2 code for flagcdn.com (country-level territory flags)
}

// ── United Kingdom — Crown Dependencies & Overseas Territories ────────────
const GBR_TERRITORIES: Territory[] = [
  { id: 'GBR-JE',  name: 'Jersey',                        parent: 'GBR', coordinates: [-2.1358, 49.2144],    flagCode: 'je' },
  { id: 'GBR-GG',  name: 'Guernsey',                      parent: 'GBR', coordinates: [-2.5853, 49.4657],    flagCode: 'gg' },
  { id: 'GBR-IM',  name: 'Isle of Man',                    parent: 'GBR', coordinates: [-4.5481, 54.2361],    flagCode: 'im' },
  { id: 'GBR-GI',  name: 'Gibraltar',                      parent: 'GBR', coordinates: [-5.3536, 36.1408],    flagCode: 'gi' },
  { id: 'GBR-BM',  name: 'Bermuda',                        parent: 'GBR', coordinates: [-64.7505, 32.3078],   flagCode: 'bm' },
  { id: 'GBR-FK',  name: 'Falkland Islands',               parent: 'GBR', coordinates: [-59.5236, -51.7963],  flagCode: 'fk' },
  { id: 'GBR-SH',  name: 'Saint Helena',                   parent: 'GBR', coordinates: [-5.7089, -15.9650],   flagCode: 'sh' },
  { id: 'GBR-KY',  name: 'Cayman Islands',                 parent: 'GBR', coordinates: [-81.2546, 19.3133],   flagCode: 'ky' },
  { id: 'GBR-TC',  name: 'Turks and Caicos',               parent: 'GBR', coordinates: [-71.7979, 21.6820],   flagCode: 'tc' },
  { id: 'GBR-VG',  name: 'British Virgin Islands',         parent: 'GBR', coordinates: [-64.6395, 18.4207],   flagCode: 'vg' },
  { id: 'GBR-AI',  name: 'Anguilla',                       parent: 'GBR', coordinates: [-63.0501, 18.2206],   flagCode: 'ai' },
  { id: 'GBR-MS',  name: 'Montserrat',                     parent: 'GBR', coordinates: [-62.1875, 16.7425],   flagCode: 'ms' },
  { id: 'GBR-IO',  name: 'British Indian Ocean Territory', parent: 'GBR', coordinates: [72.3735, -7.3696],    flagCode: 'io' },
  { id: 'GBR-PN',  name: 'Pitcairn Islands',               parent: 'GBR', coordinates: [-128.3242, -24.3768], flagCode: 'pn' },
  { id: 'GBR-GS',  name: 'South Georgia',                  parent: 'GBR', coordinates: [-36.5879, -54.4296],  flagCode: 'gs' },
];

// ── United States — Territories ───────────────────────────────────────────
const USA_TERRITORIES: Territory[] = [
  { id: 'USA-PR', name: 'Puerto Rico',               parent: 'USA', coordinates: [-66.5901, 18.2208],   flagCode: 'pr' },
  { id: 'USA-VI', name: 'US Virgin Islands',         parent: 'USA', coordinates: [-64.8963, 18.3358],   flagCode: 'vi' },
  { id: 'USA-GU', name: 'Guam',                      parent: 'USA', coordinates: [144.7448, 13.4443],   flagCode: 'gu' },
  { id: 'USA-MP', name: 'Northern Mariana Islands',  parent: 'USA', coordinates: [145.6739, 15.0979],   flagCode: 'mp' },
  { id: 'USA-AS', name: 'American Samoa',            parent: 'USA', coordinates: [-170.7020, -14.2710], flagCode: 'as' },
];

// ── France — Overseas Regions & Collectivities ────────────────────────────
const FRA_TERRITORIES: Territory[] = [
  { id: 'FRA-GP', name: 'Guadeloupe',                    parent: 'FRA', coordinates: [-61.5510, 16.2650],   flagCode: 'gp' },
  { id: 'FRA-MQ', name: 'Martinique',                    parent: 'FRA', coordinates: [-61.0242, 14.6415],   flagCode: 'mq' },
  { id: 'FRA-GF', name: 'French Guiana',                 parent: 'FRA', coordinates: [-53.1258, 3.9339],    flagCode: 'gf' },
  { id: 'FRA-RE', name: 'Réunion',                       parent: 'FRA', coordinates: [55.5364, -21.1151],   flagCode: 're' },
  { id: 'FRA-YT', name: 'Mayotte',                       parent: 'FRA', coordinates: [45.1662, -12.8275],   flagCode: 'yt' },
  { id: 'FRA-NC', name: 'New Caledonia',                  parent: 'FRA', coordinates: [165.6180, -21.2750], flagCode: 'nc' },
  { id: 'FRA-PF', name: 'French Polynesia',              parent: 'FRA', coordinates: [-149.4068, -17.6797], flagCode: 'pf' },
  { id: 'FRA-PM', name: 'Saint Pierre and Miquelon',     parent: 'FRA', coordinates: [-56.3159, 46.8852],   flagCode: 'pm' },
  { id: 'FRA-WF', name: 'Wallis and Futuna',             parent: 'FRA', coordinates: [-176.2044, -13.7687], flagCode: 'wf' },
  { id: 'FRA-BL', name: 'Saint Barthélemy',              parent: 'FRA', coordinates: [-62.8498, 17.9005],   flagCode: 'bl' },
  { id: 'FRA-MF', name: 'Saint Martin',                  parent: 'FRA', coordinates: [-63.0501, 18.0735],   flagCode: 'mf' },
];

// ── Netherlands — Constituent Countries & BES Islands ─────────────────────
const NLD_TERRITORIES: Territory[] = [
  { id: 'NLD-AW', name: 'Aruba',          parent: 'NLD', coordinates: [-69.9683, 12.5211],   flagCode: 'aw' },
  { id: 'NLD-CW', name: 'Curaçao',        parent: 'NLD', coordinates: [-68.9900, 12.1696],   flagCode: 'cw' },
  { id: 'NLD-SX', name: 'Sint Maarten',   parent: 'NLD', coordinates: [-63.0548, 18.0425],   flagCode: 'sx' },
  { id: 'NLD-BQ', name: 'Bonaire, Sint Eustatius and Saba', parent: 'NLD', coordinates: [-68.2655, 12.2019], flagCode: 'bq' },
];

// ── Denmark — Autonomous Territories ──────────────────────────────────────
const DNK_TERRITORIES: Territory[] = [
  { id: 'DNK-GL', name: 'Greenland',      parent: 'DNK', coordinates: [-42.6043, 71.7069],   flagCode: 'gl' },
  { id: 'DNK-FO', name: 'Faroe Islands',  parent: 'DNK', coordinates: [-6.9118, 61.8926],    flagCode: 'fo' },
];

// ── Australia — External Territories ──────────────────────────────────────
const AUS_TERRITORIES: Territory[] = [
  { id: 'AUS-NF', name: 'Norfolk Island',           parent: 'AUS', coordinates: [167.9547, -29.0408], flagCode: 'nf' },
  { id: 'AUS-CX', name: 'Christmas Island',         parent: 'AUS', coordinates: [105.6904, -10.4475], flagCode: 'cx' },
  { id: 'AUS-CC', name: 'Cocos (Keeling) Islands',  parent: 'AUS', coordinates: [96.8317, -12.1642],  flagCode: 'cc' },
  { id: 'AUS-HM', name: 'Heard and McDonald Islands', parent: 'AUS', coordinates: [73.5042, -53.0818], flagCode: 'hm' },
];

// ── New Zealand — Associated States & Territories ─────────────────────────
const NZL_TERRITORIES: Territory[] = [
  { id: 'NZL-CK', name: 'Cook Islands', parent: 'NZL', coordinates: [-159.7776, -21.2367], flagCode: 'ck' },
  { id: 'NZL-NU', name: 'Niue',         parent: 'NZL', coordinates: [-169.8672, -19.0544], flagCode: 'nu' },
  { id: 'NZL-TK', name: 'Tokelau',      parent: 'NZL', coordinates: [-171.8484, -9.2002],  flagCode: 'tk' },
];

// ── China — Special Administrative Regions ────────────────────────────────
const CHN_TERRITORIES: Territory[] = [
  { id: 'CHN-HK', name: 'Hong Kong', parent: 'CHN', coordinates: [114.1694, 22.3193], flagCode: 'hk' },
  { id: 'CHN-MO', name: 'Macau',     parent: 'CHN', coordinates: [113.5439, 22.1987], flagCode: 'mo' },
];

// ── Portugal — Autonomous Regions ─────────────────────────────────────────
const PRT_TERRITORIES: Territory[] = [
  { id: 'PRT-20', name: 'Azores',  parent: 'PRT', coordinates: [-25.7468, 37.7412], flagCode: 'pt' },
  { id: 'PRT-30', name: 'Madeira', parent: 'PRT', coordinates: [-16.9595, 32.7607], flagCode: 'pt' },
];

// ── Spain — Autonomous Cities & Canary Islands ────────────────────────────
const ESP_TERRITORIES: Territory[] = [
  { id: 'ESP-TF', name: 'Santa Cruz de Tenerife (Canary Islands)', parent: 'ESP', coordinates: [-16.2518, 28.4682], flagCode: 'es' },
  { id: 'ESP-GC', name: 'Las Palmas (Canary Islands)',             parent: 'ESP', coordinates: [-15.4134, 28.1248], flagCode: 'es' },
  { id: 'ESP-CE', name: 'Ceuta',                                     parent: 'ESP', coordinates: [-5.3162, 35.8894],  flagCode: 'es' },
  { id: 'ESP-ML', name: 'Melilla',                                   parent: 'ESP', coordinates: [-2.9383, 35.2922],  flagCode: 'es' },
];

// ── Finland — Autonomous Region ───────────────────────────────────────────
const FIN_TERRITORIES: Territory[] = [
  { id: 'FIN-AX', name: 'Åland Islands', parent: 'FIN', coordinates: [19.9348, 60.1785], flagCode: 'ax' },
];

// ── Mauritius — Dependencies ──────────────────────────────────────────────
const MUS_TERRITORIES: Territory[] = [
  { id: 'MUS-RO', name: 'Rodrigues', parent: 'MUS', coordinates: [63.4242, -19.7245], flagCode: 'mu' },
  { id: 'MUS-AG', name: 'Agaléga',   parent: 'MUS', coordinates: [56.6111, -10.4344], flagCode: 'mu' },
];

// ── Consolidated registry ─────────────────────────────────────────────────
export const TERRITORIES_REGISTRY: Record<string, Territory[]> = {
  'GBR': GBR_TERRITORIES,
  'USA': USA_TERRITORIES,
  'FRA': FRA_TERRITORIES,
  'NLD': NLD_TERRITORIES,
  'DNK': DNK_TERRITORIES,
  'AUS': AUS_TERRITORIES,
  'NZL': NZL_TERRITORIES,
  'CHN': CHN_TERRITORIES,
  'PRT': PRT_TERRITORIES,
  'ESP': ESP_TERRITORIES,
  'FIN': FIN_TERRITORIES,
  'MUS': MUS_TERRITORIES,
};

/** Returns the overseas territories for a country, or an empty array. */
export function getTerritoriesForCountry(countryA3: string): Territory[] {
  return TERRITORIES_REGISTRY[countryA3] || [];
}

/** Returns a display label for the territory section given a parent country. */
export function getTerritoryLabel(countryA3: string): string {
  const labels: Record<string, string> = {
    'GBR': 'Crown Dependencies & Overseas Territories',
    'USA': 'US Territories',
    'FRA': 'Overseas Regions & Collectivities',
    'NLD': 'Constituent Countries & BES Islands',
    'DNK': 'Autonomous Territories',
    'AUS': 'External Territories',
    'NZL': 'Associated States & Dependencies',
    'CHN': 'Special Administrative Regions',
    'PRT': 'Autonomous Regions',
    'ESP': 'Autonomous Cities & Canary Islands',
    'FIN': 'Autonomous Regions',
    'MUS': 'Dependencies',
  };
  return labels[countryA3] || 'Territories';
}

/** All territories flattened into a single array (useful for global map markers). */
export function getAllTerritories(): Territory[] {
  return Object.values(TERRITORIES_REGISTRY).flat();
}
