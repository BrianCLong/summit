"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Search tabs and simple search UI', async ({ page }) => {
    await page.goto('/search');
    await (0, test_1.expect)(page.getByRole('tab', { name: 'Simple' })).toBeVisible();
    await (0, test_1.expect)(page.getByRole('textbox', { name: 'Search input' })).toBeVisible();
});
