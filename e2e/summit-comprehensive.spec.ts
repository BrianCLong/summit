import { test, expect } from '@playwright/test';

test.describe('Summit Comprehensive E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Start at root
    await page.goto('/');
  });

  test('Navigate to Cases Page', async ({ page }) => {
    // Open drawer
    const menuButton = page.getByLabel('Open navigation menu');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    // Click Cases
    const casesLink = drawer.getByText('Cases');
    await expect(casesLink).toBeVisible();
    await casesLink.click();

    await expect(page).toHaveURL(/.*cases/);
    // Expect header
    await expect(page.getByRole('heading', { name: /Cases/i })).toBeVisible();
  });

  test('Navigate to Alerts Page', async ({ page }) => {
    // Open drawer
    const menuButton = page.getByLabel('Open navigation menu');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    // Click Alerts
    const alertsLink = drawer.getByText('Alerts');
    await expect(alertsLink).toBeVisible();
    await alertsLink.click();

    await expect(page).toHaveURL(/.*alerts/);
    await expect(page.getByRole('heading', { name: /Alerts/i })).toBeVisible();
  });

  test('Check Dashboard Content', async ({ page }) => {
    // Verify common dashboard elements
    // Just ensure main content area is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
