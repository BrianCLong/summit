"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Conductor Tools & Evidence', () => {
    (0, test_1.test)('renders sessions and invocations list', async ({ page }) => {
        // Assuming dev server runs on localhost:3000 (Vite dev or preview)
        await page.goto('http://localhost:3000');
        // Navigate to Conductor Studio route if present
        await page.goto('http://localhost:3000/conductor');
        await page.getByRole('tab', { name: /Tools & Evidence/i }).click();
        // Expect headings to be visible
        await (0, test_1.expect)(page.getByText(/Attached MCP Sessions/i)).toBeVisible();
        await (0, test_1.expect)(page.getByText(/Tool Invocations/i)).toBeVisible();
    });
});
