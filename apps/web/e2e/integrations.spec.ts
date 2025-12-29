import { test, expect } from '@playwright/test';

test('Integrations page loads', async ({ page }) => {
  // Assuming logged in
  await page.goto('/integrations');
  await expect(page.getByText('Integrations')).toBeVisible();
});
