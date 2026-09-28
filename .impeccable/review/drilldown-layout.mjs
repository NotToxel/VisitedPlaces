import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [size, viewport] of [['desktop', { width: 1575, height: 884 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript((mode) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: {
        places: { DEU: { status: 'VISITED', regions: {} } }, theme: mode,
      }, version: 0 }));
    }, theme);
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('.survey-map-viewport svg').first().waitFor();
    await page.waitForTimeout(500);
    const center = await page.locator('.map-search-bar').evaluate((element) => {
      const map = document.querySelector('.survey-map-viewport').getBoundingClientRect();
      const search = element.getBoundingClientRect();
      return { offset: Math.abs((search.left + search.right) / 2 - (map.left + map.right) / 2), width: search.width };
    });
    if (size === 'desktop' && center.offset > 2) throw new Error(`${theme}: search is off center by ${center.offset}px`);
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-map-centered.png` });
    const found = await page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('path.rsm-geography'));
      const tooltip = document.getElementById('map-tooltip');
      for (const path of paths) {
        const key = Object.keys(path).find((name) => name.startsWith('__reactProps'));
        const props = key ? path[key] : null;
        if (!props?.onMouseEnter) continue;
        props.onMouseEnter({ clientX: 200, clientY: 200 });
        if (tooltip?.textContent?.includes('Germany')) {
          props.onClick?.({ stopPropagation() {}, clientX: 400, clientY: 300 });
          return true;
        }
      }
      return false;
    });
    if (!found) throw new Error('Germany geography not found');
    await page.getByRole('button', { name: 'Explore regions' }).click();
    await page.locator('.map-drilldown-header').waitFor({ timeout: 20000 });
    await page.waitForTimeout(800);
    const overlap = await page.evaluate(() => {
      const header = document.querySelector('.map-drilldown-header').getBoundingClientRect();
      const search = document.querySelector('.map-search-bar').getBoundingClientRect();
      const reset = document.querySelector('.map-reset-zoom').getBoundingClientRect();
      const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return intersects(header, search) || intersects(header, reset) || intersects(search, reset);
    });
    if (overlap) throw new Error(`${size} ${theme}: drill-down controls overlap`);
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-drilldown-layout.png` });
    await page.getByRole('button', { name: 'Back to World' }).click();
    await page.locator('.map-drilldown-header').waitFor({ state: 'detached' });
    console.log(`${size} ${theme}: centered search, drill-down layout, and back passed`);
    await page.close();
  }
}
await browser.close();
