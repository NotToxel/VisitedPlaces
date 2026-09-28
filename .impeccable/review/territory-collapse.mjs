import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
for (const [name, viewport, shouldCollapse] of [
  ['wide', { width: 1575, height: 884 }, false],
  ['narrow', { width: 1024, height: 768 }, true],
  ['short', { width: 1440, height: 650 }, true],
  ['mobile', { width: 390, height: 844 }, true],
]) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:5174/');
  await page.locator('path.rsm-geography').first().waitFor();
  const found = await page.evaluate(() => {
    const paths = Array.from(document.querySelectorAll('path.rsm-geography'));
    const tooltip = document.getElementById('map-tooltip');
    for (const path of paths) {
      const key = Object.keys(path).find((value) => value.startsWith('__reactProps'));
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
  if (!found) throw new Error(`${name}: UK geography not found`);
  await page.getByRole('button', { name: 'Explore regions' }).click();
  const panel = page.locator('.territory-list-panel');
  try {
    await panel.waitFor({ timeout: 20000 });
  } catch (error) {
    console.log(`${name}: drill-down state`, await page.evaluate(() => ({
      header: document.querySelector('.map-drilldown-header')?.textContent,
      preload: document.querySelector('.standard-map-wrapper')?.textContent?.slice(0, 200),
      menu: document.querySelector('.country-context-menu')?.textContent,
    })));
    await page.screenshot({ path: `.impeccable/review/${name}-territory-timeout.png` });
    throw error;
  }
  await page.waitForTimeout(900);
  if (await panel.getByRole('button').first().getAttribute('aria-expanded') !== String(!shouldCollapse)) {
    throw new Error(`${name}: wrong initial territory panel state`);
  }
  await page.screenshot({ path: `.impeccable/review/${name}-territory-default.png` });
  await panel.locator('.territory-list-panel__header').click();
  if (await panel.locator('.territory-list-panel__header').getAttribute('aria-expanded') !== String(shouldCollapse)) {
    throw new Error(`${name}: manual territory toggle failed`);
  }
  if (name === 'narrow') {
    await page.setViewportSize({ width: 1575, height: 884 });
    if (await panel.locator('.territory-list-panel__header').getAttribute('aria-expanded') !== 'true') {
      throw new Error('Panel did not expand after leaving compact viewport');
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    if (await panel.locator('.territory-list-panel__header').getAttribute('aria-expanded') !== 'false') {
      throw new Error('Panel did not collapse after re-entering compact viewport');
    }
  }
  console.log(`${name}: initial state, manual toggle, and resize passed`);
  await page.close();
}
await browser.close();
