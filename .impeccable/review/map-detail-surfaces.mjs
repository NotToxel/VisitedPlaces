import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [size, viewport] of [['desktop', { width: 1575, height: 884 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript((mode) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: {
        places: { GBR: { status: 'VISITED', regions: {} } }, theme: mode,
      }, version: 0 }));
    }, theme);
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('.survey-map-viewport svg').first().waitFor();
    await page.waitForTimeout(500);
    const found = await page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('path.rsm-geography'));
      const tooltip = document.getElementById('map-tooltip');
      for (const path of paths) {
        const key = Object.keys(path).find((name) => name.startsWith('__reactProps'));
        const props = key ? path[key] : null;
        if (!props?.onMouseEnter) continue;
        props.onMouseEnter({ clientX: 200, clientY: 200 });
        if (tooltip?.textContent?.includes('United Kingdom')) {
          props.onClick?.({ stopPropagation() {}, clientX: 400, clientY: 300 });
          return true;
        }
      }
      return false;
    });
    if (!found) throw new Error('United Kingdom geography not found');
    await page.locator('.country-context-menu').waitFor();
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-map-popup.png` });
    await page.getByRole('button', { name: 'Explore regions' }).click();
    await page.locator('.territory-list-panel').waitFor({ timeout: 20000 });
    await page.waitForTimeout(700);
    if (size === 'mobile') await page.locator('.territory-list-panel__header').click();
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-territories.png` });
    const action = page.getByRole('button', { name: 'Mark Gibraltar as Wishlist' });
    await action.click();
    if (await page.getByRole('button', { name: 'Clear Gibraltar status' }).getAttribute('aria-pressed') !== 'true') {
      throw new Error(`${size} ${theme}: territory status failed`);
    }
    const style = await page.locator('.territory-list-panel').evaluate((el) => getComputedStyle(el).backdropFilter);
    if (style !== 'none') throw new Error(`${size} ${theme}: legacy glass backdrop remained`);
    const regionFound = await page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('.standard-map-wrapper--drilldown path.rsm-geography'));
      for (const path of paths) {
        const key = Object.keys(path).find((name) => name.startsWith('__reactProps'));
        const props = key ? path[key] : null;
        if (!props?.onClick) continue;
        props.onClick({ stopPropagation() {}, clientX: 500, clientY: 320 });
        return true;
      }
      return false;
    });
    if (!regionFound) throw new Error(`${size} ${theme}: region geography not found`);
    await page.locator('.country-context-menu').waitFor();
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-region-popup.png` });
    console.log(`${size} ${theme}: popup and territory panel passed`);
    await page.close();
  }
}
await browser.close();
