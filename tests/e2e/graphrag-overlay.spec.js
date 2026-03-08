"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Copilot highlights why_paths', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open Investigation' }).click();
    await page.getByRole('button', { name: 'Ask' }).click();
    await (0, test_1.expect)(page.getByText('Confidence:')).toBeVisible();
    // Custom event fired by panel after applying classes
    const evt = await page.evaluate(() => new Promise((res) => {
        document
            .querySelector('#cy')
            .addEventListener('intelgraph:why_paths_applied', (e) => res(true), {
            once: true,
        });
    }));
    (0, test_1.expect)(evt).toBeTruthy();
});
