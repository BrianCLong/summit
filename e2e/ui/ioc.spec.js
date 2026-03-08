"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('IOC list and detail', async ({ page }) => {
    await page.goto('/ioc');
    await (0, test_1.expect)(page.getByText('IOCs')).toBeVisible();
    await page.goto('/ioc/ioc1');
    await (0, test_1.expect)(page.getByText('IOC —')).toBeVisible();
});
