import { test, expect } from '@playwright/test';

test('Search tabs and simple search UI', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByRole('tab', { name: 'Simple' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search input' })).toBeVisible();
});

