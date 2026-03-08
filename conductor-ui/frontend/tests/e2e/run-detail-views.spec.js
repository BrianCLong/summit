"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// conductor-ui/frontend/tests/e2e/run-detail-views.spec.ts
const test_1 = require("@playwright/test");
test_1.test.describe('Run Detail Views', () => {
    (0, test_1.test)('should display the run graph and streaming logs', async ({ page }) => {
        await page.goto('/runs/some-run-id');
        // Check for Graph View
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Run Graph' })).toBeVisible();
        await (0, test_1.expect)(page.locator('div[style*="height: 400px"]')).toBeVisible(); // Placeholder for graph canvas
        // Check for Logs Pane
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Streaming Logs' })).toBeVisible();
        await (0, test_1.expect)(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    });
});
