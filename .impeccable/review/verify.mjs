import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:5174/');
await page.locator('.survey-map-viewport svg').first().waitFor();

const hex = page.getByRole('button', { name: 'Hexagon map' });
await hex.click();
if ((await hex.getAttribute('aria-pressed')) !== 'true') throw new Error('Hex view did not activate');
await page.getByRole('button', { name: 'World map' }).click();
if ((await hex.getAttribute('aria-pressed')) !== 'false') throw new Error('World view did not reactivate');

const sheet = page.getByRole('button', { name: 'Map statuses' });
await sheet.click();
const visited = page.getByRole('button', { name: /Visited 0/ });
await visited.click();
if ((await visited.getAttribute('aria-pressed')) !== 'false') throw new Error('Status visibility did not toggle');

await page.getByRole('button', { name: 'Settings' }).click();
const dialog = page.locator('.survey-settings-dialog');
await dialog.waitFor();
const topmost = await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight - 110)?.closest('.survey-settings-dialog') !== null);
if (!topmost) throw new Error('Settings dialog is covered by map controls');
await page.screenshot({ path: '.impeccable/review/mobile-light-settings-final.png' });
await dialog.getByRole('button', { name: 'Use Dark' }).click();
if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') throw new Error('Dark theme did not apply');
await page.waitForTimeout(350);
await page.screenshot({ path: '.impeccable/review/mobile-dark-settings-final.png' });
await dialog.getByRole('button', { name: 'Use Light' }).click();
await dialog.locator('button').first().click();

await page.getByRole('link', { name: 'Places', exact: true }).click();
await page.getByRole('heading', { name: 'Places', exact: true }).waitFor();
await page.screenshot({ path: '.impeccable/review/mobile-light-list-final.png' });
console.log('Hex, status filter, settings layering, theme toggle, and mobile navigation passed');
await browser.close();
