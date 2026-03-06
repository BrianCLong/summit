import { test, expect } from '@playwright/test';

test.describe('Summit Smoke Tests', () => {
  test('should load dashboard and show main title', async ({ page }) => {
    // Navigate to base URL
    await page.goto('/');

    // The router redirects / to /dashboard.
    // ProtectedRoute might redirect to /login.

    // We expect the title to contain IntelGraph
    await expect(page).toHaveTitle(/IntelGraph/);

    // We expect the header to be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('IntelGraph Platform');
  });

  test('should verify navigation drawer', async ({ page }) => {
    await page.goto('/');

    // Check for menu button (aria-label="Open navigation menu")
    const menuButton = page.getByLabel('Open navigation menu');
    await expect(menuButton).toBeVisible();

    // Click to open drawer
    await menuButton.click();

    // Verify drawer content
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    // Verify common navigation items
    await expect(drawer.getByText('Dashboard')).toBeVisible();
    await expect(drawer.getByText('Search')).toBeVisible();
    await expect(drawer.getByText('Graph Explorer')).toBeVisible();
  });

  test('should navigate to search page', async ({ page }) => {
    await page.goto('/');

    // Open drawer
    const menuButton = page.getByLabel('Open navigation menu');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Click Search
    const drawer = page.locator('.MuiDrawer-paper');
    await drawer.getByText('Search').click();

    // Verify URL
    await expect(page).toHaveURL(/.*\/search/);

    // Verify search page content (generic check)
    // Assuming there is a heading or input
    // Just verifying URL is a good start for smoke test
  });
});
