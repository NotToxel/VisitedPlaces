import { test, expect } from '@playwright/test';

test('Verify Hexagon Map, List Grouping, and Sub-regions', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // Take screenshot of default map
  await page.screenshot({ path: 'world_map_default.png' });

  // Switch to Hexagon Map
  await page.click('text=Hexagon Map');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'hexagon_map_grid.png' });

  // Switch back to Standard Map to test drill down
  await page.click('text=Standard Map');
  await page.waitForTimeout(500);

  // Click roughly in the center (Africa / Europe) to trigger drill-down
  // Standard Map is 800x400 SVG. We click roughly in the middle
  await page.mouse.click(400, 200); 
  await page.waitForTimeout(2000); // Wait for fetch
  await page.screenshot({ path: 'subregion_drilldown_attempt.png' });

  // Test List View Grouping
  await page.click('text=List View');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'list_view_continents.png' });
});
