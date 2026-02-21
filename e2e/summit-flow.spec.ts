import { test, expect } from '@playwright/test';

test.describe('Summit Application Flow', () => {
  test('should load the dashboard', async ({ page }) => {
    // Navigate to the frontend (assumed to be running on baseURL from config)
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/IntelGraph/);

    // Check header visibility
    await expect(page.locator('header')).toBeVisible();
  });

  test('should have Summit API reachable', async ({ request }) => {
    // Direct check to the Python backend
    // Note: In a real environment, this might be proxied via :3000/api or :4000/api
    // But here we check the service directly as defined in webServer config
    const response = await request.get('http://localhost:8000/');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBeTruthy();
    expect(data.products).toContain('factflow');
  });
});
