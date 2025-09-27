import { test, expect } from '@playwright/test';
test('Find Similar shows candidates', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Graph').click();
  // emulate cxttap on a node via UI helper if available
  await page.getByRole('button', { name: 'Find Similar' }).click();
  await expect(page.getByText('Similar Entities')).toBeVisible();
});