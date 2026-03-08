"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// =============================================
// File: e2e/maestro.policy.spec.ts
// =============================================
const test_1 = require("@playwright/test");
const gotoWebTab = async (page) => {
    await page.goto('/maestro');
    await page.getByRole('tab', { name: 'Web' }).click();
};
test_1.test.describe('Maestro — Policy gate & elevation', () => {
    (0, test_1.test)('Attach-to-Case denial shows banner and elevation flow works', async ({ page, }) => {
        await gotoWebTab(page);
        // Select first interface and run orchestrator
        const interfaces = page.getByRole('checkbox');
        await interfaces.first().check();
        await page.getByRole('button', { name: 'Run' }).click();
        // Wait for Synthesized section
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Synthesized' })).toBeVisible();
        // Attempt attach to case → PolicyButton checks '/policy/check' and MSW denies
        await page.getByRole('button', { name: 'Attach to Case' }).click();
        // Denial banner visible
        await (0, test_1.expect)(page.getByText('Action blocked')).toBeVisible();
        await (0, test_1.expect)(page.getByText('Attach restricted to Gold tier')).toBeVisible();
        // Open elevation dialog
        await page.getByRole('button', { name: 'Request elevation' }).click();
        // Fill and submit
        await page
            .getByRole('textbox')
            .fill('Investigative case requires attachment for audit.');
        await page.getByRole('button', { name: 'Submit' }).click();
        // Ticket confirmation
        await (0, test_1.expect)(page.getByText(/Elevation submitted · Ticket/)).toBeVisible();
    });
});
