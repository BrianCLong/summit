"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('loads graph and shows timeline controls', async ({ page }) => {
    await page.goto('/graph');
    await (0, test_1.expect)(page.getByLabel('From')).toBeVisible();
    await (0, test_1.expect)(page.getByLabel('To')).toBeVisible();
});
(0, test_1.test)('shows enrichment panel when node selected (smoke)', async ({ page }) => {
    await page.goto('/graph');
    // Try to click near the center to select a node (depends on sample layout)
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    // Check that "Enrichment" text appears somewhere
    await (0, test_1.expect)(page.getByText(/Enrichment/i)).toBeVisible({ timeout: 2000 });
});
