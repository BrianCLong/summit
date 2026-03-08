"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Find Similar shows candidates', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Graph').click();
    // emulate cxttap on a node via UI helper if available
    await page.getByRole('button', { name: 'Find Similar' }).click();
    await (0, test_1.expect)(page.getByText('Similar Entities')).toBeVisible();
});
