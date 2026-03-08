"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Review Queue', () => {
    (0, test_1.test)('filter -> open item -> approve -> disappears from open list', async ({ page }) => {
        await page.goto('/review-queue');
        await page.selectOption('#filter-type', 'evidence');
        const target = page.getByText('Evidence snippet: anomalous fund transfer');
        await (0, test_1.expect)(target).toBeVisible();
        await target.click();
        await page.getByRole('button', { name: /approve/i }).click();
        await (0, test_1.expect)(page.getByText('Evidence snippet: anomalous fund transfer')).not.toBeVisible();
    });
});
