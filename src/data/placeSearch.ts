/** Small, offline place-to-region guide. Keep entries unambiguous and use the
 * same ISO 3166-2 IDs as the geography shown in the map. */
export interface SearchPlace {
  name: string;
  countryId: string;
  regionId: string;
  regionName: string;
  aliases?: string[];
}

export const SEARCH_PLACES: SearchPlace[] = [
  { name: 'Los Angeles', countryId: 'USA', regionId: 'USA-US-CA', regionName: 'California' },
  { name: 'San Francisco', countryId: 'USA', regionId: 'USA-US-CA', regionName: 'California' },
  { name: 'Orlando', countryId: 'USA', regionId: 'USA-US-FL', regionName: 'Florida' },
  { name: 'Las Vegas', countryId: 'USA', regionId: 'USA-US-NV', regionName: 'Nevada' },
  { name: 'New York City', countryId: 'USA', regionId: 'USA-US-NY', regionName: 'New York', aliases: ['NYC'] },
  { name: 'Stonehenge', countryId: 'GBR', regionId: 'GBR-GB-WIL', regionName: 'Wiltshire' },
  { name: 'Loch Ness', countryId: 'GBR', regionId: 'GBR-GB-HLD', regionName: 'Highland' },
  { name: 'Tenerife', countryId: 'ESP', regionId: 'ESP-TF', regionName: 'Santa Cruz de Tenerife (Canary Islands)' },
  { name: 'Ibiza', countryId: 'ESP', regionId: 'ESP-ES-PM', regionName: 'Baleares' },
  { name: 'Mallorca', countryId: 'ESP', regionId: 'ESP-ES-PM', regionName: 'Baleares', aliases: ['Majorca'] },
  { name: 'Benidorm', countryId: 'ESP', regionId: 'ESP-ES-A', regionName: 'Alicante' },
  { name: 'Marseille', countryId: 'FRA', regionId: 'FRA-FR-13', regionName: 'Bouches-du-Rhône' },
  { name: 'Nice', countryId: 'FRA', regionId: 'FRA-FR-06', regionName: 'Alpes-Maritimes' },
  { name: 'Florence', countryId: 'ITA', regionId: 'ITA-IT-FI', regionName: 'Firenze' },
  { name: 'Venice', countryId: 'ITA', regionId: 'ITA-IT-VE', regionName: 'Venezia' },
  { name: 'Bali', countryId: 'IDN', regionId: 'IDN-ID-BA', regionName: 'Bali' },
  { name: 'Jakarta', countryId: 'IDN', regionId: 'IDN-ID-JK', regionName: 'Jakarta Raya' },
];
