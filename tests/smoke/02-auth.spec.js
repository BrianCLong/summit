"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('login page loads', async ({ page }) => {
    await page.goto('/');
    await (0, test_1.expect)(page).toHaveTitle(/IntelGraph/i);
    await (0, test_1.expect)(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
});
// Optional: token-based API probe (if SERVICE_TOKEN is wired)
(0, test_1.test)('token can access /graphql persisted health query', async ({ request, baseURL, }) => {
    const token = process.env.SERVICE_TOKEN;
    test_1.test.skip(!token, 'SERVICE_TOKEN not set');
    const body = {
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: process.env.PQ_HEALTH_HASH || '000',
            },
        },
    };
    const res = await request.post(`${baseURL}/graphql`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: body,
    });
    (0, test_1.expect)(res.status()).toBeLessThan(500);
});
