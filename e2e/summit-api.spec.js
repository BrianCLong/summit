"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Summit API', () => {
    const SUMMIT_API_URL = process.env.SUMMIT_API_URL || 'http://localhost:8000';
    (0, test_1.test)('should return list of products on root endpoint', async ({ request }) => {
        const response = await request.get(`${SUMMIT_API_URL}/`);
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        (0, test_1.expect)(data).toHaveProperty('products');
        (0, test_1.expect)(Array.isArray(data.products)).toBeTruthy();
        (0, test_1.expect)(data.products).toContain('factflow');
    });
    (0, test_1.test)('should return 404 for unknown route', async ({ request }) => {
        const response = await request.get(`${SUMMIT_API_URL}/unknown-route`);
        (0, test_1.expect)(response.status()).toBe(404);
    });
});
