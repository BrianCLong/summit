import { test, expect } from '@playwright/test';

test.describe('Maestro Run Console', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    // Expect the title to contain a substring.
    await expect(page).toHaveTitle(/Summit|IntelGraph/);
  });

  test('should navigate to Maestro runs', async ({ page }) => {
    await page.goto('/maestro/runs');
    // Check for a heading or element that indicates the page loaded
    await expect(page.locator('h1')).toBeVisible();
  });
});
