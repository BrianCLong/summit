"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Saved views', () => {
    (0, test_1.test)('saves, reloads, and restores the brushed window', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel('Name').fill('Morning brush');
        await page.locator('#range-start').evaluate((el) => {
            const input = el;
            input.value = '6';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.locator('#range-end').evaluate((el) => {
            const input = el;
            input.value = '12';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.getByRole('button', { name: /Save view/i }).click();
        await page.reload();
        await page.getByRole('button', { name: /Morning brush/i }).click();
        await (0, test_1.expect)(page.getByText(/Start 6/)).toBeVisible();
        await (0, test_1.expect)(page.getByText(/End 12/)).toBeVisible();
    });
});
