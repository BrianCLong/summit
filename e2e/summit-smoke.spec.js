"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Summit Smoke Tests', () => {
    (0, test_1.test)('should load dashboard and show main title', async ({ page }) => {
        // Navigate to base URL
        await page.goto('/');
        // The router redirects / to /dashboard.
        // ProtectedRoute might redirect to /login.
        // We expect the title to contain IntelGraph
        await (0, test_1.expect)(page).toHaveTitle(/IntelGraph/);
        // We expect the header to be visible
        const header = page.locator('header');
        await (0, test_1.expect)(header).toBeVisible();
        await (0, test_1.expect)(header).toContainText('IntelGraph Platform');
    });
    (0, test_1.test)('should verify navigation drawer', async ({ page }) => {
        await page.goto('/');
        // Check for menu button (aria-label="Open navigation menu")
        const menuButton = page.getByLabel('Open navigation menu');
        await (0, test_1.expect)(menuButton).toBeVisible();
        // Click to open drawer
        await menuButton.click();
        // Verify drawer content
        const drawer = page.locator('.MuiDrawer-paper');
        await (0, test_1.expect)(drawer).toBeVisible();
        // Verify common navigation items
        await (0, test_1.expect)(drawer.getByText('Dashboard')).toBeVisible();
        await (0, test_1.expect)(drawer.getByText('Search')).toBeVisible();
        await (0, test_1.expect)(drawer.getByText('Graph Explorer')).toBeVisible();
    });
    (0, test_1.test)('should navigate to search page', async ({ page }) => {
        await page.goto('/');
        // Open drawer
        const menuButton = page.getByLabel('Open navigation menu');
        await (0, test_1.expect)(menuButton).toBeVisible();
        await menuButton.click();
        // Click Search
        const drawer = page.locator('.MuiDrawer-paper');
        await drawer.getByText('Search').click();
        // Verify URL
        await (0, test_1.expect)(page).toHaveURL(/.*\/search/);
        // Verify search page content (generic check)
        // Assuming there is a heading or input
        // Just verifying URL is a good start for smoke test
    });
});
