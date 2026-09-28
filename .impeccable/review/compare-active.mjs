import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const code = Buffer.from(JSON.stringify({
  USA: { status: 'VISITED', regions: {} },
  GBR: { status: 'VISITED', regions: {} },
  JPN: { status: 'WISHLIST', regions: {} },
})).toString('base64url');

for (const [width, height, size] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript((mode) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: {
        places: { USA: { status: 'VISITED', regions: {} }, FRA: { status: 'WISHLIST', regions: {} } },
        theme: mode,
      }, version: 0 }));
    }, theme);
    await page.goto('http://127.0.0.1:5174/compare');
    await page.getByPlaceholder("Paste a friend's share code here...").fill(code);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(1000);
    if (await page.locator('.compare-empty').count()) throw new Error('Compare import did not show results');
    await page.screenshot({ path: `.impeccable/review/${size}-${theme}-compare-active.png` });
    console.log(`${size} ${theme}: active comparison rendered`);
    await page.close();
  }
}
await browser.close();
