"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('IntelGraph Canvas', () => {
    (0, test_1.test)('should display the graph canvas and panels', async ({ page }) => {
        await page.goto('/graph/new-canvas');
        // Expect the graph container to be visible
        const graphContainer = page.locator('div[style*="width: 100%"][style*="height: 100%"][style*="border: 1px solid rgb(204, 204, 204)"]');
        await (0, test_1.expect)(graphContainer).toBeVisible();
        // Expect the panels to be visible
        await (0, test_1.expect)(page.getByText('Entities')).toBeVisible();
        await (0, test_1.expect)(page.getByText('Relationships')).toBeVisible();
        await (0, test_1.expect)(page.getByText('AI Suggestions')).toBeVisible();
        await (0, test_1.expect)(page.getByText('Copilot Runs')).toBeVisible();
        // Optional: Check for loading indicator if it's still present for a very short time
        // await expect(page.getByText('Loading Graph Data...')).not.toBeVisible();
    });
});
