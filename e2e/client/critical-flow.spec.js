"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Critical Flow: Sign-in and Search', () => {
    (0, test_1.test)('should allow a user to sign in and perform a search', async ({ page, }) => {
        await page.goto('/login');
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await (0, test_1.expect)(page).toHaveURL('/dashboard');
        await page.fill('input[name="search"]', 'example query');
        await page.press('input[name="search"]', 'Enter');
        await (0, test_1.expect)(page.locator('.search-results')).toBeVisible();
    });
});
