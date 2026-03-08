"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Summit Dashboard Navigation', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });
    (0, test_1.test)('should navigate to Search page', async ({ page }) => {
        // Open drawer if not already open (assuming mobile/tablet or collapsed by default, but existing test implies it needs opening)
        // However, existing test says "Check for menu button... Click to open drawer".
        const menuButton = page.getByLabel('Open navigation menu');
        if (await menuButton.isVisible()) {
            await menuButton.click();
        }
        const drawer = page.locator('.MuiDrawer-paper');
        await (0, test_1.expect)(drawer).toBeVisible();
        const searchLink = drawer.getByText('Search');
        await (0, test_1.expect)(searchLink).toBeVisible();
        await searchLink.click();
        // Verify URL or content
        await (0, test_1.expect)(page).toHaveURL(/.*search/);
        // Or check for a heading
        // await expect(page.locator('h1')).toContainText('Search');
    });
    (0, test_1.test)('should navigate to Graph Explorer page', async ({ page }) => {
        const menuButton = page.getByLabel('Open navigation menu');
        if (await menuButton.isVisible()) {
            await menuButton.click();
        }
        const drawer = page.locator('.MuiDrawer-paper');
        await (0, test_1.expect)(drawer).toBeVisible();
        const graphLink = drawer.getByText('Graph Explorer');
        await (0, test_1.expect)(graphLink).toBeVisible();
        await graphLink.click();
        // Verify URL or content
        await (0, test_1.expect)(page).toHaveURL(/.*graph/);
    });
});
