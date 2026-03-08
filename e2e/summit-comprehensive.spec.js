"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Summit Comprehensive E2E Flow', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Start at root
        await page.goto('/');
    });
    (0, test_1.test)('Navigate to Cases Page', async ({ page }) => {
        // Open drawer
        const menuButton = page.getByLabel('Open navigation menu');
        await (0, test_1.expect)(menuButton).toBeVisible();
        await menuButton.click();
        const drawer = page.locator('.MuiDrawer-paper');
        await (0, test_1.expect)(drawer).toBeVisible();
        // Click Cases
        const casesLink = drawer.getByText('Cases');
        await (0, test_1.expect)(casesLink).toBeVisible();
        await casesLink.click();
        await (0, test_1.expect)(page).toHaveURL(/.*cases/);
        // Expect header
        await (0, test_1.expect)(page.getByRole('heading', { name: /Cases/i })).toBeVisible();
    });
    (0, test_1.test)('Navigate to Alerts Page', async ({ page }) => {
        // Open drawer
        const menuButton = page.getByLabel('Open navigation menu');
        await (0, test_1.expect)(menuButton).toBeVisible();
        await menuButton.click();
        const drawer = page.locator('.MuiDrawer-paper');
        await (0, test_1.expect)(drawer).toBeVisible();
        // Click Alerts
        const alertsLink = drawer.getByText('Alerts');
        await (0, test_1.expect)(alertsLink).toBeVisible();
        await alertsLink.click();
        await (0, test_1.expect)(page).toHaveURL(/.*alerts/);
        await (0, test_1.expect)(page.getByRole('heading', { name: /Alerts/i })).toBeVisible();
    });
    (0, test_1.test)('Check Dashboard Content', async ({ page }) => {
        // Verify common dashboard elements
        // Just ensure main content area is visible
        const main = page.locator('main');
        await (0, test_1.expect)(main).toBeVisible();
    });
});
