import { test, expect } from '@playwright/test';

test('Inventory Graph renders and exports PNG', async ({ page }) => {
  await page.goto(process.env.WEB_URL || 'http://localhost:3000/inventory/graph');
  await expect(page.locator('#cy-canvas')).toBeVisible();

  // Force-directed layout completes (node count visible)
  await expect(page.locator('[data-testid="node-count"]')).toHaveText(/^\d+$/);

  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click()
  ]);
  const name = await download.suggestedFilename();
  expect(name).toMatch(/inventory-graph-.*\.png$/);
});