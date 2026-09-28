import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const places = {
  GBR: { status: 'VISITED', regions: {} }, FRA: { status: 'VISITED', regions: {} },
  ITA: { status: 'REVISIT', regions: {} }, ESP: { status: 'WISHLIST', regions: {} },
  DEU: { status: 'WISHLIST', regions: {} }, JPN: { status: 'WISHLIST', regions: {} },
};

for (const [size, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript(({ places, theme }) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places, theme }, version: 0 }));
    }, { places, theme });
    await page.goto('http://127.0.0.1:5174/list');
    await page.getByRole('heading', { name: 'Places', exact: true }).waitFor();
    await page.locator('.list-continent-chip').filter({ hasText: 'Europe' }).click();
    await page.locator('.list-status-pill--wishlist').click();
    const summary = page.locator('.survey-list__filter-summary');
    if (!(await summary.innerText()).includes('Europe · Wishlist')) throw new Error('Active filters are not described');
    if ((await page.locator('.list-status-pill--wishlist').getAttribute('aria-pressed')) !== 'true') throw new Error('Active status is not pressed');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-list-filtered.png` });
    await summary.getByRole('button', { name: /Clear filters/ }).click();
    if (await page.locator('.survey-list__filter-summary--active').count()) throw new Error('Clear filters did not reset selection');
    console.log(`${size} ${theme}: filters and reset passed`);
    await page.close();
  }
}
await browser.close();
