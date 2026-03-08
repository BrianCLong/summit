"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Investigations list renders and navigates to detail', async ({ page, }) => {
    await page.goto('/investigations');
    await (0, test_1.expect)(page.getByText('Investigations')).toBeVisible();
    // Navigate to a detail page (mock id)
    await page.goto('/investigations/inv1');
    await (0, test_1.expect)(page.getByText('Investigation —')).toBeVisible();
    await (0, test_1.expect)(page.getByText('Export Report')).toBeVisible();
});
