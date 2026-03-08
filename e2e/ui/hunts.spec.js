"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Hunt list and run page', async ({ page }) => {
    await page.goto('/hunts');
    await (0, test_1.expect)(page.getByText('Threat Hunts')).toBeVisible();
    await page.goto('/hunts/h1');
    await (0, test_1.expect)(page.getByText('Hunt Run')).toBeVisible();
    await (0, test_1.expect)(page.getByRole('button', { name: 'Re-run' })).toBeVisible();
});
