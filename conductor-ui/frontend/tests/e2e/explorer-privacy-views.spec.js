"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// conductor-ui/frontend/tests/e2e/explorer-privacy-views.spec.ts
const test_1 = require("@playwright/test");
test_1.test.describe('Explorer and Privacy Views', () => {
    (0, test_1.test)('should navigate to the Graph Explorer and see a title', async ({ page, }) => {
        await page.goto('/explorer');
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Graph Explorer' })).toBeVisible();
    });
    (0, test_1.test)('should navigate to the Privacy Console and see a title', async ({ page, }) => {
        await page.goto('/admin/privacy');
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Privacy & Retention Console' })).toBeVisible();
    });
});
