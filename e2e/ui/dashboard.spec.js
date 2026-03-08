"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Dashboard Loads & Panels Render', async ({ page }) => {
    await page.goto('/dashboard');
    await (0, test_1.expect)(page.getByText('Stats Overview')).toBeVisible();
    await (0, test_1.expect)(page.getByText('p95 Latency')).toBeVisible();
    await (0, test_1.expect)(page.getByText('Error Ratio')).toBeVisible();
});
