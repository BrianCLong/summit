"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('relationship controls present', async ({ page }) => {
    await page.goto('/graph');
    await (0, test_1.expect)(page.getByRole('button', { name: /Play/i })).toBeVisible();
});
