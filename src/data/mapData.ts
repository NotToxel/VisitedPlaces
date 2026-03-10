export interface MapMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  flagCode?: string; // ISO-A2 code for flags
}

// Microstates and small entities for the global World Map
export const MICROSTATES: MapMarker[] = [
  { id: 'VAT', name: 'Vatican City', coordinates: [12.4534, 41.9029], flagCode: 'va' },
  { id: 'MCO', name: 'Monaco', coordinates: [7.4202, 43.7384], flagCode: 'mc' },
  { id: 'SMR', name: 'San Marino', coordinates: [12.4578, 43.9424], flagCode: 'sm' },
  { id: 'LIE', name: 'Liechtenstein', coordinates: [9.5209, 47.1660], flagCode: 'li' },
  { id: 'AND', name: 'Andorra', coordinates: [1.5218, 42.5063], flagCode: 'ad' },
  { id: 'NRU', name: 'Nauru', coordinates: [166.9315, -0.5228], flagCode: 'nr' },
  { id: 'TUV', name: 'Tuvalu', coordinates: [179.1940, -8.5137], flagCode: 'tv' },
  { id: 'SYC', name: 'Seychelles', coordinates: [55.4920, -4.6796], flagCode: 'sc' },
  { id: 'MUS', name: 'Mauritius', coordinates: [57.5522, -20.3484], flagCode: 'mu' },
  { id: 'MDV', name: 'Maldives', coordinates: [73.2207, 3.2028], flagCode: 'mv' },
  { id: 'SGP', name: 'Singapore', coordinates: [103.8198, 1.3521], flagCode: 'sg' },
  { id: 'BHR', name: 'Bahrain', coordinates: [50.5577, 26.0667], flagCode: 'bh' },
  { id: 'MLT', name: 'Malta', coordinates: [14.4326, 35.9375], flagCode: 'mt' },
  { id: 'BRB', name: 'Barbados', coordinates: [-59.5432, 13.1939], flagCode: 'bb' },
  { id: 'ATG', name: 'Antigua and Barbuda', coordinates: [-61.7964, 17.0608], flagCode: 'ag' },
  { id: 'KNA', name: 'Saint Kitts and Nevis', coordinates: [-62.7829, 17.3578], flagCode: 'kn' },
  { id: 'GRD', name: 'Grenada', coordinates: [-61.6067, 12.1165], flagCode: 'gd' },
  { id: 'VCT', name: 'Saint Vincent and the Grenadines', coordinates: [-61.2225, 13.2528], flagCode: 'vc' },
  { id: 'LCA', name: 'Saint Lucia', coordinates: [-60.9789, 13.9094], flagCode: 'lc' },
  { id: 'FSM', name: 'Federated States of Micronesia', coordinates: [158.1499, 6.9147], flagCode: 'fm' },
  { id: 'MHL', name: 'Marshall Islands', coordinates: [171.1845, 7.1315], flagCode: 'mh' },
  { id: 'PLW', name: 'Palau', coordinates: [134.5825, 7.5149], flagCode: 'pw' },
  { id: 'GBR-BMU', name: 'Bermuda', coordinates: [-64.7505, 32.3078], flagCode: 'bm' },
  { id: 'GBR-FLK', name: 'Falkland Islands', coordinates: [-59.5236, -51.7963], flagCode: 'fk' },
  { id: 'GBR-GIB', name: 'Gibraltar', coordinates: [-5.3536, 36.1408], flagCode: 'gi' },
  { id: 'GBR-SHN', name: 'Saint Helena', coordinates: [-5.7089, -15.9650], flagCode: 'sh' },
  { id: 'HKG', name: 'Hong Kong', coordinates: [114.1694, 22.3193], flagCode: 'hk' },
  { id: 'MAC', name: 'Macau', coordinates: [113.5439, 22.1987], flagCode: 'mo' },
  // US Territories for global map (markers)
  { id: 'USA-72', name: 'Puerto Rico', coordinates: [-66.5901, 18.2208], flagCode: 'pr' },
  { id: 'USA-78', name: 'US Virgin Islands', coordinates: [-64.8963, 18.3358], flagCode: 'vi' },
  { id: 'USA-66', name: 'Guam', coordinates: [144.7448, 13.4443], flagCode: 'gu' },
  { id: 'USA-69', name: 'Northern Mariana Islands', coordinates: [145.6739, 15.0979], flagCode: 'mp' },
  { id: 'USA-60', name: 'American Samoa', coordinates: [-170.7020, -14.2710], flagCode: 'as' },
];

// UK Crown Dependencies and Overseas Territories (Checklist)
export const UK_TERRITORIES: MapMarker[] = [
  { id: 'GBR-JEY', name: 'Jersey', coordinates: [-2.1358, 49.2144], flagCode: 'je' },
  { id: 'GBR-GGY', name: 'Guernsey', coordinates: [-2.5853, 49.4657], flagCode: 'gg' },
  { id: 'GBR-IMN', name: 'Isle of Man', coordinates: [-4.5481, 54.2361], flagCode: 'im' },
  { id: 'GBR-GIB', name: 'Gibraltar', coordinates: [-5.3536, 36.1408], flagCode: 'gi' },
  { id: 'GBR-BMU', name: 'Bermuda', coordinates: [-64.7505, 32.3078], flagCode: 'bm' },
  { id: 'GBR-FLK', name: 'Falkland Islands', coordinates: [-59.5236, -51.7963], flagCode: 'fk' },
  { id: 'GBR-SHN', name: 'Saint Helena', coordinates: [-5.7089, -15.9650], flagCode: 'sh' },
  { id: 'GBR-CYM', name: 'Cayman Islands', coordinates: [-81.2546, 19.3133], flagCode: 'ky' },
  { id: 'GBR-TCA', name: 'Turks and Caicos', coordinates: [-71.7979, 21.6820], flagCode: 'tc' },
  { id: 'GBR-VGB', name: 'British Virgin Islands', coordinates: [-64.6395, 18.4207], flagCode: 'vg' },
  { id: 'GBR-AIA', name: 'Anguilla', coordinates: [-63.0501, 18.2206], flagCode: 'ai' },
  { id: 'GBR-MSR', name: 'Montserrat', coordinates: [-62.1875, 16.7425], flagCode: 'ms' },
  { id: 'GBR-IOT', name: 'British Indian Ocean Territory', coordinates: [72.3735, -7.3696], flagCode: 'io' },
  { id: 'GBR-PCN', name: 'Pitcairn Islands', coordinates: [-128.3242, -24.3768], flagCode: 'pn' },
  { id: 'GBR-SGS', name: 'South Georgia', coordinates: [-36.5879, -54.4296], flagCode: 'gs' }
];

// USA Territories (Checklist)
export const USA_TERRITORIES: MapMarker[] = [
  { id: 'USA-72', name: 'Puerto Rico', coordinates: [-66.5901, 18.2208], flagCode: 'pr' },
  { id: 'USA-78', name: 'US Virgin Islands', coordinates: [-64.8963, 18.3358], flagCode: 'vi' },
  { id: 'USA-66', name: 'Guam', coordinates: [144.7448, 13.4443], flagCode: 'gu' },
  { id: 'USA-69', name: 'Northern Mariana Islands', coordinates: [145.6739, 15.0979], flagCode: 'mp' },
  { id: 'USA-60', name: 'American Samoa', coordinates: [-170.7020, -14.2710], flagCode: 'as' }
];

// Replaced by 2023 Unitary Authorities in TopoJSON but still provided in map bundle overlaps
export const OBSOLETE_UK_REGIONS = new Set([
  'E10000002', // Buckinghamshire County (former)
  'E10000006', // Cumbria County (former) [FIXED TYPO OVERRIDING DEVON]
  'E10000009', // Dorset County (former)
  'E10000021', // Northamptonshire County (former)
  'E10000023', // North Yorkshire County (former)
  'E10000027', // Somerset County (former)
  'S12000015', // Fife (former)
  'S12000024', // Perth and Kinross (former)
  'S12000044', // North Lanarkshire (former)
  'S12000046', // Glasgow City (former)
  'E08000016', // Barnsley (former)
  'E08000019', // Sheffield (former)
  'E06000028', // Bournemouth (former)
  'E06000029', // Poole (former)
]);
