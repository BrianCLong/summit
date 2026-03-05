import { test, expect } from '@playwright/test';

test.describe('Summit API', () => {
  const SUMMIT_API_URL = process.env.SUMMIT_API_URL || 'http://localhost:8000';

  test('should return list of products on root endpoint', async ({ request }) => {
    const response = await request.get(`${SUMMIT_API_URL}/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('products');
    expect(Array.isArray(data.products)).toBeTruthy();
    expect(data.products).toContain('factflow');
  });

  test('should return 404 for unknown route', async ({ request }) => {
    const response = await request.get(`${SUMMIT_API_URL}/unknown-route`);
    expect(response.status()).toBe(404);
  });
});
