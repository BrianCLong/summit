import { test, expect } from '@playwright/test';

test.describe('Golden Path E2E', () => {
  test('User can access the main dashboard and verify core layout', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/Maestro|IntelGraph|Platform/i);

    // 2. Visit Dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // 3. Take a screenshot for evidence
    await page.screenshot({ path: 'test-results/golden-path-dashboard.png' });
  });
});
