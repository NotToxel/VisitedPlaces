import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1044, height: 884 } });
  await page.addInitScript((mode) => {
    localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places: {}, theme: mode }, version: 0 }));
  }, theme);
  for (const [route, selector, name] of [
    ['/', '.map-search-bar__input', 'map'],
    ['/list', 'input[placeholder="Search countries..."]', 'places'],
    ['/compare', 'input[placeholder="Paste a friend\'s share code here..."]', 'compare'],
  ]) {
    await page.goto(`http://127.0.0.1:5174${route}`);
    const field = page.locator(selector);
    await field.waitFor();
    await field.click();
    const style = await field.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { outline: computed.outlineStyle, shadow: computed.boxShadow };
    });
    if (style.outline !== 'none' || style.shadow !== 'none') throw new Error(`${theme} ${name}: ${JSON.stringify(style)}`);
    if (name === 'map') {
      const overlapsReset = await page.evaluate(() => {
        const search = document.querySelector('.map-search-bar').getBoundingClientRect();
        const reset = document.querySelector('.map-reset-zoom').getBoundingClientRect();
        return search.right > reset.left && search.left < reset.right && search.bottom > reset.top && search.top < reset.bottom;
      });
      if (overlapsReset) throw new Error(`${theme}: search control overlaps reset button`);
    }
    await page.screenshot({ path: `.impeccable/review/${theme}-${name}-focused.png` });
    console.log(`${theme} ${name}: no nested focus box`);
  }
  await page.close();
}
await browser.close();
