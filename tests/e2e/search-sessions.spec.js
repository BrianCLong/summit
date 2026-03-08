"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Search sessions', () => {
    (0, test_1.test)('persist filters across reload', async ({ page }) => {
        await page.goto('about:blank');
        await page.evaluate(() => localStorage.clear());
        await page.goto('/explore');
        await page.getByTestId('search-session-tabs').waitFor();
        await page.getByTestId('add-session').click();
        const sessionTab = page.getByRole('tab', { name: /Session 2/i });
        await (0, test_1.expect)(sessionTab).toBeVisible();
        await sessionTab.click();
        const dateInputs = page.locator('input[type="date"]');
        await (0, test_1.expect)(dateInputs.first()).toBeVisible();
        await dateInputs.first().fill('2024-01-01');
        await dateInputs.nth(1).fill('2024-12-31');
        await page.reload();
        await page.getByTestId('search-session-tabs').waitFor();
        await (0, test_1.expect)(page.getByRole('tab', { name: /Session 2/i })).toHaveAttribute('data-state', 'active');
        await (0, test_1.expect)(page.locator('input[type="date"]').first()).toHaveValue('2024-01-01');
        await (0, test_1.expect)(page.getByText('Results may have changed')).toBeVisible();
    });
});
