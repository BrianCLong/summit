import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('Frontend loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Maestro/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('API health check', async ({ request, baseURL }) => {
    // Assuming API is proxied or available relative to base URL if running full stack
    // Or we can hit the API port directly if needed.
    // Given the config uses port 3000 for web and 4000 for server,
    // and this test runs against web URL by default.
    // We'll try hitting the API directly.
    const apiContext = await request.newContext({
      baseURL: 'http://localhost:4000',
    });
    const response = await apiContext.get('/health');
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.status).toBe('healthy');
  });
});
