import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [size, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript((theme) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places: {}, theme }, version: 0 }));
    }, theme);
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('.survey-map-viewport svg').first().waitFor();
    await page.getByRole('button', { name: 'Enable express marking' }).click();
    const express = page.locator('.map-express-bar');
    await express.waitFor();
    await express.getByRole('button', { name: 'Mark as Wishlist' }).click();
    if ((await express.getByRole('button', { name: 'Mark as Wishlist' }).getAttribute('aria-pressed')) !== 'true') throw new Error('Express status did not change');
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('.map-express-bar').getBoundingClientRect();
      const b = document.querySelector('.map-search-bar').getBoundingClientRect();
      const c = document.querySelector('.map-reset-zoom').getBoundingClientRect();
      const intersects = (x, y) => x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
      return intersects(a, b) || intersects(a, c);
    });
    if (overlap) throw new Error(`${size} ${theme}: Express controls overlap map controls`);
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-express.png` });
    await express.getByRole('button', { name: 'Disable express marking' }).click();
    if (await page.locator('.map-express-bar').count()) throw new Error('Express controls did not close');
    console.log(`${size} ${theme}: Express controls passed`);
    await page.close();
  }
}
await browser.close();
