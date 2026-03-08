"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// =============================================
// File: e2e/maestro.keyboard.spec.ts
// =============================================
const test_1 = require("@playwright/test");
const gotoMaestro = async (page) => {
    await page.goto('/maestro');
    await (0, test_1.expect)(page.getByRole('heading', { name: 'Maestro' })).toBeVisible();
};
test_1.test.describe('Maestro — ARIA tabs & keyboard', () => {
    (0, test_1.test)('tabs expose roles and keyboard navigation works', async ({ page }) => {
        await gotoMaestro(page);
        const routingTab = page.getByRole('tab', { name: 'Routing' });
        const webTab = page.getByRole('tab', { name: 'Web' });
        const budgetsTab = page.getByRole('tab', { name: 'Budgets' });
        const logsTab = page.getByRole('tab', { name: 'Logs' });
        await (0, test_1.expect)(routingTab).toHaveAttribute('aria-selected', 'true');
        await (0, test_1.expect)(page.getByRole('tabpanel', { name: 'Routing' })).toBeVisible();
        // ArrowRight → Web
        await routingTab.focus();
        await page.keyboard.press('ArrowRight');
        await (0, test_1.expect)(webTab).toHaveAttribute('aria-selected', 'true');
        await (0, test_1.expect)(page.getByRole('tabpanel', { name: 'Web' })).toBeVisible();
        // Home → Routing
        await page.keyboard.press('Home');
        await (0, test_1.expect)(routingTab).toHaveAttribute('aria-selected', 'true');
        // End → Logs
        await page.keyboard.press('End');
        await (0, test_1.expect)(logsTab).toHaveAttribute('aria-selected', 'true');
        await (0, test_1.expect)(page.getByRole('tabpanel', { name: 'Logs' })).toBeVisible();
        // Click Budgets to ensure mouse also works
        await budgetsTab.click();
        await (0, test_1.expect)(budgetsTab).toHaveAttribute('aria-selected', 'true');
    });
});
