"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('accepting a suggestion creates an edge and shows toast', async ({ page, }) => {
    await page.goto('http://localhost:3001/cases/c1');
    await page.getByText('Predictive Links').waitFor();
    const first = page.locator('.suggestion-item').first();
    await first.hover();
    await first.getByRole('button', { name: /Accept/ }).click();
    await (0, test_1.expect)(page.getByRole('status')).toContainText(/accepted/i);
});
