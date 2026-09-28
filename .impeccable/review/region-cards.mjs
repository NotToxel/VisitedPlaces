import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [size, viewport] of [['desktop', { width: 1575, height: 884 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript((mode) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places: {}, theme: mode }, version: 0 }));
    }, theme);
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('.survey-map-viewport svg').first().waitFor();
    await page.locator('path.rsm-geography').first().waitFor();
    await page.waitForTimeout(300);
    const found = await page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('path.rsm-geography'));
      const tooltip = document.getElementById('map-tooltip');
      for (const path of paths) {
        const key = Object.keys(path).find((name) => name.startsWith('__reactProps'));
        const props = key ? path[key] : null;
        if (!props?.onMouseEnter) continue;
        props.onMouseEnter({ clientX: 200, clientY: 200 });
        if (tooltip?.textContent?.includes('Fiji')) {
          props.onClick?.({ stopPropagation() {}, clientX: 400, clientY: 300 });
          return true;
        }
      }
      return false;
    });
    if (!found) throw new Error('Fiji geography not found');
    await page.getByRole('button', { name: 'Explore regions' }).click();
    await page.locator('.region-card').first().waitFor({ timeout: 30000 });
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-region-cards.png` });
    console.log(`${size} ${theme}: region cards passed`);
    await page.close();
  }
}
await browser.close();
