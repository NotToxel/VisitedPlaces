import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [size, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript((mode) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places: {}, theme: mode }, version: 0 }));
    }, theme);
    await page.goto('http://127.0.0.1:5174/');
    await page.getByRole('button', { name: 'Hexagon map' }).click();
    const labels = page.locator('.map-search-bar__hex-label-toggle input[type="checkbox"]');
    await labels.waitFor();
    const appearance = await labels.evaluate((el) => getComputedStyle(el).appearance);
    if (appearance !== 'none') throw new Error(`${size} ${theme}: native hex checkbox`);
    await labels.check();
    if (!await labels.isChecked()) throw new Error('Hex labels checkbox did not check');
    await page.waitForTimeout(200);
    if (await labels.evaluate((el) => getComputedStyle(el, '::before').transform) === 'matrix(0, 0, 0, 0, 0, 0)') throw new Error('Hex checkmark is hidden');
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-hex-checkbox.png` });
    if (size === 'desktop') {
      await page.goto('http://127.0.0.1:5174/list');
      const subregions = page.locator('.survey-list__subregions-toggle input[type="checkbox"]');
      await subregions.waitFor();
      if (await subregions.evaluate((el) => getComputedStyle(el).appearance) !== 'none') throw new Error(`${theme}: native Places checkbox`);
      await subregions.check();
      if (!await subregions.isChecked()) throw new Error('Subregions checkbox did not check');
      await page.waitForTimeout(200);
      if (await subregions.evaluate((el) => getComputedStyle(el, '::before').transform) === 'matrix(0, 0, 0, 0, 0, 0)') throw new Error('Places checkmark is hidden');
      await page.screenshot({ path: `.impeccable/review/${size}-${theme}-list-checkbox.png` });
    }
    console.log(`${size} ${theme}: custom checkboxes passed`);
    await page.close();
  }
}
await browser.close();
