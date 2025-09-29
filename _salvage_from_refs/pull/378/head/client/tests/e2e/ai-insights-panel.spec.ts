import { test, expect } from '@playwright/test';

test('AI Insights panel highlights communities and exports data', async ({ page }) => {
  await page.goto('/graph/cytoscape');
  await page.getByRole('button', { name: 'AI Insights' }).click();
  await page.getByLabel('Highlight Communities').click();
  const color = await page.evaluate(() => {
    const n = (window as any).cy.nodes()[0];
    return n.style('background-color');
  });
  expect(color).toBeTruthy();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click()
  ]);
  expect(download.suggestedFilename()).toContain('json');
});
