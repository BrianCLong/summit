"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Smoke Tests', () => {
    (0, test_1.test)('Frontend loads successfully', async ({ page }) => {
        await page.goto('/');
        await (0, test_1.expect)(page).toHaveTitle(/Maestro/i);
        await (0, test_1.expect)(page.locator('body')).toBeVisible();
    });
    (0, test_1.test)('API health check', async ({ request, baseURL }) => {
        // Assuming API is proxied or available relative to base URL if running full stack
        // Or we can hit the API port directly if needed.
        // Given the config uses port 3000 for web and 4000 for server,
        // and this test runs against web URL by default.
        // We'll try hitting the API directly.
        const apiContext = await request.newContext({
            baseURL: 'http://localhost:4000',
        });
        const response = await apiContext.get('/health');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const json = await response.json();
        (0, test_1.expect)(json.status).toBe('healthy');
    });
});
