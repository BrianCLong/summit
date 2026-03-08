"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Visual Pipelines page renders and copilot suggest works', async ({ page, }) => {
    await page.goto('http://localhost:3000/pipelines');
    await (0, test_1.expect)(page.getByText(/Visual Pipelines/)).toBeVisible();
    await page.getByRole('button', { name: /Copilot Suggest/i }).click();
    await (0, test_1.expect)(page.getByText(/Copilot Suggestion/)).toBeVisible();
});
