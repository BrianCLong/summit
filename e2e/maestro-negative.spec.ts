import { test, expect } from '@playwright/test';

test.describe('Maestro Negative Paths', () => {

  test('UI: 404 Page for non-existent route', async ({ page, baseURL }) => {
    const randomPath = `/not-found-${Math.random().toString(36).slice(2)}`;
    const url = new URL(randomPath, baseURL).toString();

    // Navigate to a non-existent page
    const response = await page.goto(url);

    // In a SPA, the status might still be 200 (serving index.html) or 404 if SSR.
    // We check for a "Not Found" message or 404 status.
    // Assuming standard behavior: if 200, check for "Page Not Found" text.

    if (response?.status() === 404) {
      expect(response.status()).toBe(404);
    } else {
      // If SPA handles routing client-side
      await expect(page.getByText(/page not found|404|nothing here/i)).toBeVisible();
    }
  });

  test('API: 404 for non-existent endpoint', async ({ request, baseURL }) => {
    const randomEndpoint = `/api/v1/does-not-exist-${Math.random().toString(36).slice(2)}`;
    const url = new URL(randomEndpoint, baseURL).toString();

    const response = await request.get(url);
    expect(response.status()).toBe(404);
  });

  test('API: 401/403 for unauthorized access', async ({ request, baseURL }) => {
    // Attempt to access a protected endpoint without a token
    // Assuming /api/users/me which is typically protected
    const url = new URL('/api/users/me', baseURL).toString();

    const response = await request.get(url, {
        headers: {
            // Explicitly no auth
        }
    });

    // Expect 401 Unauthorized or 403 Forbidden
    expect([401, 403]).toContain(response.status());
  });

  test('GraphQL: Handle malformed query', async ({ request, baseURL }) => {
    const url = new URL('/api/graphql', baseURL).toString();

    const response = await request.post(url, {
      data: {
        query: 'query { invalidField }'
      }
    });

    // GraphQL typically returns 200 or 400 with errors array
    const json = await response.json();
    expect(json.errors).toBeDefined();
    expect(Array.isArray(json.errors)).toBeTruthy();
    expect(json.errors.length).toBeGreaterThan(0);
  });

});
