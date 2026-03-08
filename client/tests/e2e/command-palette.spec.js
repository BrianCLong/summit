"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('command palette jumps to case workspace and focuses input', async ({ page, }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: /Command palette/i });
    await (0, test_1.expect)(dialog).toBeVisible();
    await page.getByLabel('Command palette search').fill('case');
    await page.getByRole('option', { name: /Open case workspace/i }).click();
    await (0, test_1.expect)(page).toHaveURL(/\/cases/);
    await (0, test_1.expect)(page.getByLabel('Name')).toBeFocused();
});
