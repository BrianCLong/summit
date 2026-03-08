"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Maestro Run Console', () => {
    (0, test_1.test)('should load the home page', async ({ page }) => {
        await page.goto('/');
        // Expect the title to contain a substring.
        await (0, test_1.expect)(page).toHaveTitle(/Summit|IntelGraph/);
    });
    (0, test_1.test)('should navigate to Maestro runs', async ({ page }) => {
        await page.goto('/maestro/runs');
        // Check for a heading or element that indicates the page loaded
        await (0, test_1.expect)(page.locator('h1')).toBeVisible();
    });
});
