import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'docs', 'screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Build consistent dual-schema demo data
function createPlacesStore() {
  const places = {};

  const setCountry = (code, status) => {
    places[code] = {
      status,
      regions: places[code]?.regions || {}
    };
  };

  const setRegion = (parentCode, regionIso, status) => {
    const fullKey = `${parentCode}-${regionIso}`;
    if (!places[parentCode]) {
      places[parentCode] = { status: 'NONE', regions: {} };
    }
    places[parentCode].regions[fullKey] = status;
    places[fullKey] = { status, regions: {} };

    if (status === 'VISITED') {
      places[parentCode].status = 'VISITED';
    } else if (status === 'WISHLIST' && places[parentCode].status !== 'VISITED') {
      places[parentCode].status = 'WISHLIST';
    }
  };

  // Visited Countries
  const visitedCountries = [
    'MEX', 'FRA', 'DEU', 'ITA', 'ESP', 'PRT', 'NLD', 'BEL', 'CHE', 'AUT',
    'GRC', 'ISL', 'NOR', 'DNK', 'IRL', 'JPN', 'THA', 'SGP', 'AUS', 'NZL',
    'ZAF', 'EGY', 'BRA', 'TUR', 'HRV', 'CZE', 'HUN'
  ];
  visitedCountries.forEach((c) => setCountry(c, 'VISITED'));

  // Wishlist Countries
  const wishlistCountries = [
    'SWE', 'FIN', 'KOR', 'VNM', 'IDN', 'IND', 'MAR', 'KEN', 'TZA', 'ARG',
    'CHL', 'PER', 'CRI', 'JOR'
  ];
  wishlistCountries.forEach((c) => setCountry(c, 'WISHLIST'));

  // Avoid Countries
  setCountry('PRK', 'AVOID');

  // Revisit Countries
  setCountry('ISL', 'REVISIT');
  setCountry('JPN', 'REVISIT');
  setCountry('ITA', 'REVISIT');

  // USA Subregions (US States)
  setCountry('USA', 'VISITED');
  const usaVisited = [
    'US-CA', 'US-NY', 'US-WA', 'US-FL', 'US-CO', 'US-TX', 'US-HI', 'US-NV',
    'US-IL', 'US-MA', 'US-OR', 'US-NC', 'US-VA', 'US-DC'
  ];
  const usaWishlist = ['US-AZ', 'US-UT', 'US-AK', 'US-MT', 'US-WY', 'US-NM'];
  usaVisited.forEach((st) => setRegion('USA', st, 'VISITED'));
  usaWishlist.forEach((st) => setRegion('USA', st, 'WISHLIST'));

  // Canada Subregions
  setCountry('CAN', 'VISITED');
  setRegion('CAN', 'CA-ON', 'VISITED');
  setRegion('CAN', 'CA-BC', 'VISITED');
  setRegion('CAN', 'CA-QC', 'VISITED');
  setRegion('CAN', 'CA-AB', 'WISHLIST');

  // UK Subregions
  setCountry('GBR', 'VISITED');
  setRegion('GBR', 'GB-ENG', 'VISITED');
  setRegion('GBR', 'GB-SCT', 'VISITED');
  setRegion('GBR', 'GB-WLS', 'VISITED');
  setRegion('GBR', 'GB-NIR', 'WISHLIST');

  // Australia Subregions
  setCountry('AUS', 'VISITED');
  setRegion('AUS', 'AU-NSW', 'VISITED');
  setRegion('AUS', 'AU-VIC', 'VISITED');
  setRegion('AUS', 'AU-QLD', 'VISITED');
  setRegion('AUS', 'AU-WA', 'WISHLIST');

  return places;
}

function createFriendStore() {
  const places = {};

  const setCountry = (code, status) => {
    places[code] = { status, regions: places[code]?.regions || {} };
  };

  const setRegion = (parentCode, regionIso, status) => {
    const fullKey = `${parentCode}-${regionIso}`;
    if (!places[parentCode]) {
      places[parentCode] = { status: 'NONE', regions: {} };
    }
    places[parentCode].regions[fullKey] = status;
    places[fullKey] = { status, regions: {} };
    if (status === 'VISITED') places[parentCode].status = 'VISITED';
  };

  ['USA', 'FRA', 'ESP', 'ITA', 'JPN', 'KOR', 'CHN', 'IND', 'AUS', 'BRA', 'PER', 'ARG', 'COL', 'MAR'].forEach(
    (c) => setCountry(c, 'VISITED')
  );
  ['NOR', 'ISL', 'NZL', 'ZAF'].forEach((c) => setCountry(c, 'WISHLIST'));

  setRegion('USA', 'US-NY', 'VISITED');
  setRegion('USA', 'US-FL', 'VISITED');
  setRegion('USA', 'US-TX', 'VISITED');
  setRegion('USA', 'US-MA', 'VISITED');

  return places;
}

const userDemoPlaces = createPlacesStore();
const friendDemoPlaces = createFriendStore();

const compareGroups = [
  {
    id: 'group-1',
    name: 'Travel Buddies',
    friends: [
      {
        id: 'friend-1',
        name: "Alex's Passport",
        places: friendDemoPlaces
      }
    ]
  }
];

async function launchBrowser() {
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (e) {
    try {
      return await chromium.launch({ ...launchOptions, channel: 'msedge' });
    } catch (e2) {
      return await chromium.launch({ ...launchOptions, channel: 'chrome' });
    }
  }
}

async function capture() {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
  console.log(`Starting automated screenshot capture targeting: ${baseUrl}`);

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // Set localStorage demo data before navigation
  await page.addInitScript(
    ({ userPlaces, groups }) => {
      localStorage.setItem(
        'visited-places-storage',
        JSON.stringify({
          state: {
            places: userPlaces,
            theme: 'dark'
          },
          version: 0
        })
      );
      localStorage.setItem('visited-places-compare-groups', JSON.stringify(groups));
    },
    { userPlaces: userDemoPlaces, groups: compareGroups }
  );

  console.log('📸 1. Capturing World Map (Standard View)...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Allow TopoJSON render & animations
  await page.screenshot({
    path: path.join(outputDir, '01-world-map.png'),
    fullPage: false
  });

  console.log('📸 2. Capturing Hexagon Map View...');
  const hexBtn = page.getByRole('button', { name: /Hexagon/i }).or(page.locator('button:has-text("Hexagon")')).first();
  if (await hexBtn.isVisible()) {
    await hexBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(outputDir, '02-hexagon-map.png'),
      fullPage: false
    });
  }

  console.log('📸 3. Capturing Regional Map Drill-Down (United States)...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Trigger click on USA path
  await page.evaluate(() => {
    const paths = Array.from(document.querySelectorAll('path.rsm-geography'));
    const tooltipEl = document.getElementById('map-tooltip');
    
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const propKey = Object.keys(p).find(k => k.startsWith('__reactProps'));
      const props = propKey ? p[propKey] : null;
      if (props && props.onMouseEnter) {
        props.onMouseEnter({ clientX: 200, clientY: 200 });
        const text = tooltipEl?.textContent || '';
        if (text.includes('United States')) {
          props.onClick?.({
            stopPropagation: () => {},
            clientX: 400,
            clientY: 300
          });
          break;
        }
      }
    }
  });

  await page.waitForTimeout(1000);
  const exploreBtn = page.locator('button:has-text("Explore regions")').first();
  if (await exploreBtn.isVisible()) {
    await exploreBtn.click();
    // Wait for Natural Earth admin-1 GeoJSON to download and map to zoom
    await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return !text.includes('Loading') || text.includes('Back') || text.includes('Territories');
    }, { timeout: 40000 });
    await page.waitForTimeout(3000);
  }

  await page.screenshot({
    path: path.join(outputDir, '06-regional-drilldown.png'),
    fullPage: false
  });

  console.log('📸 4. Capturing Country Directory (List View)...');
  await page.goto(`${baseUrl}/list`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(outputDir, '03-country-directory.png'),
    fullPage: false
  });

  console.log('📸 5. Capturing Sub-Region Drawer (United States States & Progress)...');
  const searchInputList = page.locator('input[placeholder*="Search countries"]').first();
  if (await searchInputList.isVisible()) {
    await searchInputList.fill('United States');
    await page.waitForTimeout(1000);
  }
  const usaCard = page.locator('.list-country-card').filter({ hasText: 'United States of America' });
  await usaCard.click();
  await page.locator('.survey-list__sidebar').getByText('Sub-regions Explorer').waitFor();
  await page.locator('.survey-list__sidebar input[placeholder="Find region..."]').waitFor({ timeout: 40000 });
  await page.screenshot({
    path: path.join(outputDir, '07-subregions-drawer.png'),
    fullPage: false
  });

  console.log('📸 6. Capturing Analytics Dashboard...');
  await page.goto(`${baseUrl}/analytics`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(outputDir, '04-analytics-dashboard.png'),
    fullPage: false
  });

  console.log('📸 7. Capturing Compare Mode with Friends...');
  await page.goto(`${baseUrl}/compare`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(outputDir, '05-compare-mode.png'),
    fullPage: false
  });

  console.log('📸 8. Capturing Light Mobile Map...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('group', { name: 'Color theme' }).getByRole('button', { name: 'Light' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outputDir, '08-light-mobile-map.png'),
    fullPage: false
  });

  console.log('📸 9. Capturing Light Mobile Regional Map...');
  await page.evaluate(() => {
    const paths = Array.from(document.querySelectorAll('path.rsm-geography'));
    const tooltipEl = document.getElementById('map-tooltip');
    for (const path of paths) {
      const propKey = Object.keys(path).find(key => key.startsWith('__reactProps'));
      const props = propKey ? path[propKey] : null;
      props?.onMouseEnter?.({ clientX: 200, clientY: 200 });
      if (tooltipEl?.textContent?.includes('United States')) {
        props.onClick?.({ stopPropagation: () => {}, clientX: 200, clientY: 300 });
        props.onMouseLeave?.();
        return;
      }
    }
    throw new Error('United States map path was not found');
  });
  await page.getByRole('button', { name: /Explore regions/i }).click();
  await page.getByRole('button', { name: /Back to World/i }).waitFor({ timeout: 40000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outputDir, '09-light-mobile-regions.png'), fullPage: false });

  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
  console.log('📸 10. Capturing Light Mobile Places...');
  await mobileNav.getByRole('link', { name: 'Places' }).click();
  await page.getByRole('heading', { name: 'Places' }).waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outputDir, '10-light-mobile-places.png'), fullPage: false });

  console.log('📸 11. Capturing Light Mobile Place Detail...');
  await page.getByRole('textbox', { name: 'Search countries' }).fill('United States');
  await page.locator('.list-country-card').filter({ hasText: 'United States of America' }).click();
  await page.getByText('Sub-regions Explorer').last().waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '11-light-mobile-place-detail.png'), fullPage: false });
  await page.getByTitle('Close details').last().click();

  console.log('📸 12. Capturing Light Mobile Insights...');
  await mobileNav.getByRole('link', { name: 'Insights' }).click();
  await page.getByRole('heading', { name: 'Your coverage' }).waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outputDir, '12-light-mobile-insights.png'), fullPage: false });

  console.log('📸 13. Capturing Light Mobile Compare...');
  await mobileNav.getByRole('link', { name: 'Compare' }).click();
  await page.getByRole('heading', { name: 'Compare maps' }).waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outputDir, '13-light-mobile-compare.png'), fullPage: false });

  await browser.close();
  console.log(`✅ All screenshots captured successfully in: ${outputDir}`);
}

capture().catch((err) => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
