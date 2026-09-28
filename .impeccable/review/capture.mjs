import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = 'http://127.0.0.1:5174';
const out = path.resolve('.impeccable/review');
fs.mkdirSync(out, { recursive: true });

const marked = {
  USA: 'VISITED', CAN: 'VISITED', GBR: 'VISITED', FRA: 'VISITED', ESP: 'VISITED',
  DEU: 'VISITED', ITA: 'REVISIT', JPN: 'REVISIT', AUS: 'VISITED', BRA: 'VISITED',
  MEX: 'WISHLIST', IND: 'WISHLIST', NZL: 'WISHLIST', MAR: 'WISHLIST',
  EGY: 'AVOID', ZAF: 'VISITED', NOR: 'WISHLIST', ARG: 'WISHLIST',
};
const places = Object.fromEntries(Object.entries(marked).map(([id, status]) => [id, { status, regions: {} }]));

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch {
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
}

for (const [mode, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addInitScript(({ places, theme }) => {
      localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places, theme }, version: 0 }));
    }, { places, theme });
    const page = await context.newPage();
    for (const [name, route] of [['map', '/'], ['list', '/list'], ['analytics', '/analytics'], ['compare', '/compare'], ['about', '/about']]) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor();
      if (name === 'list') await page.getByRole('heading', { name: 'Places', exact: true }).waitFor();
      if (name === 'analytics') await page.getByRole('heading', { name: 'Your coverage' }).waitFor();
      if (name === 'about') await page.getByRole('heading', { name: /About VisitedPlaces/ }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (name === 'map') await page.locator('.survey-map-viewport svg').first().waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(name === 'analytics' ? 1800 : name === 'map' ? 1200 : 500);
      const file = path.join(out, `${mode}-${theme}-${name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(file);
      if (name === 'map') {
        const hex = page.getByRole('button', { name: 'Hexagon map' });
        await hex.click();
        await page.waitForTimeout(400);
        const hexFile = path.join(out, `${mode}-${theme}-hex.png`);
        await page.screenshot({ path: hexFile, fullPage: false });
        console.log(hexFile);
      }
    }
    await context.close();
  }
}
await browser.close();
