"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('auth → search → graph view', async ({ page }) => {
    await page.goto(process.env.WEB_URL);
    await page.getByLabel('Email').fill(process.env.E2E_USER);
    await page.getByLabel('Password').fill(process.env.E2E_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await (0, test_1.expect)(page.getByText('Welcome')).toBeVisible();
    await page.getByPlaceholder('Search').fill('contoso');
    await page.keyboard.press('Enter');
    await (0, test_1.expect)(page.getByTestId('results-count')).toBeVisible();
    await page.getByTestId('open-graph').click();
    await (0, test_1.expect)(page.getByTestId('graph-canvas')).toBeVisible();
});
