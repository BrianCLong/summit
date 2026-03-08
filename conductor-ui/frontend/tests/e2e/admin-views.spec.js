"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// conductor-ui/frontend/tests/e2e/admin-views.spec.ts
const test_1 = require("@playwright/test");
test_1.test.describe('Admin Views', () => {
    (0, test_1.test)('should navigate to the Tenant Admin page and see a title', async ({ page, }) => {
        await page.goto('/admin/tenants');
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Tenant Administration' })).toBeVisible();
    });
    (0, test_1.test)('should navigate to the Audit Log page and see a title', async ({ page, }) => {
        await page.goto('/admin/audit');
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    });
});
