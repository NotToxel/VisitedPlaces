import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [name, viewport, theme] of [
  ['phone', { width: 390, height: 844 }, 'light'],
  ['phone-dark', { width: 390, height: 844 }, 'dark'],
  ['narrow-landscape', { width: 722, height: 600 }, 'light'],
]) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript((mode) => {
    localStorage.setItem('visited-places-storage', JSON.stringify({ state: { places: {}, theme: mode }, version: 0 }));
  }, theme);
  await page.goto('http://localhost:5174/');
  await page.locator('path.rsm-geography').first().waitFor();
  const found = await page.evaluate(() => {
    const tooltip = document.getElementById('map-tooltip');
    for (const path of document.querySelectorAll('path.rsm-geography')) {
      const key = Object.keys(path).find((name) => name.startsWith('__reactProps'));
      const props = key ? path[key] : null;
      if (!props?.onMouseEnter) continue;
      props.onMouseEnter({ clientX: 200, clientY: 200 });
      if (tooltip?.textContent?.includes('France')) {
        props.onClick?.({ stopPropagation() {}, clientX: 350, clientY: 260 });
        return true;
      }
    }
    return false;
  });
  if (!found) throw new Error(`${name}: France geography not found`);
  await page.getByRole('button', { name: 'Explore regions' }).click();
  await page.locator('.territory-list-panel').waitFor({ timeout: 30000 });
  await page.waitForTimeout(900);
  const readBoxes = () => page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    return { panel: box('.territory-list-panel'), reset: box('.map-reset-zoom'), search: box('.map-search-bar'), status: box('.map-filter-bar'), nav: box('.survey-mobile-nav'), express: box('.map-express-bar') };
  });
  const assertLayout = (boxes, state) => {
    if (boxes.panel.top < boxes.search.bottom + 8 || boxes.panel.bottom > boxes.status.top - 8) throw new Error(`${name} ${state}: territory panel clashes with search or statuses`);
    if (boxes.reset.bottom > boxes.search.top || boxes.reset.right <= boxes.panel.left) throw new Error(`${name} ${state}: reset zoom is misplaced`);
    if (boxes.express && boxes.panel.top < boxes.express.bottom + 8) throw new Error(`${name} ${state}: territory panel clashes with express controls`);
  };
  let boxes = await readBoxes();
  assertLayout(boxes, 'collapsed');
  console.log(name, 'collapsed', boxes);
  await page.screenshot({ path: `.impeccable/review/${name}-territory-position-collapsed.png` });
  await page.locator('.territory-list-panel__header').click();
  await page.waitForTimeout(350);
  boxes = await readBoxes();
  assertLayout(boxes, 'expanded');
  await page.screenshot({ path: `.impeccable/review/${name}-territory-position-expanded.png` });
  await page.getByRole('button', { name: 'Enable express marking' }).click();
  await page.waitForTimeout(350);
  boxes = await readBoxes();
  console.log(name, 'express', boxes);
  assertLayout(boxes, 'express');
  await page.screenshot({ path: `.impeccable/review/${name}-territory-position-express.png` });
  await page.close();
}
await browser.close();
