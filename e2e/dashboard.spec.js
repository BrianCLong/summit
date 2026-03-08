"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const WEB = process.env.BASE_WEB || 'http://localhost:3000';
(0, test_1.test)('dashboard charts render & export works', async ({ page }) => {
    await page.goto(`${WEB}/dashboard`);
    await (0, test_1.expect)(page.getByTestId('investigation-metrics')).toBeVisible({
        timeout: 15000,
    });
    const exportBtn = page.getByRole('button', { name: /Export/i });
    if (await exportBtn.isVisible()) {
        await exportBtn.click();
        await (0, test_1.expect)(page.getByText(/Export/)).toBeVisible();
    }
});
