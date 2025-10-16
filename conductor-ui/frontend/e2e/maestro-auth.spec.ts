import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Maestro Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Maestro
    await page.goto(`${BASE_URL}/maestro`);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Should be redirected to authentication page
    await expect(page).toHaveURL(/.*\/maestro\/login/);

    // Should show login UI
    await expect(page.locator('h2')).toContainText('Sign In to Maestro');
    await expect(page.locator('button')).toContainText('Continue with OIDC');
  });

  test('should initiate OIDC flow when login button clicked', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/maestro/login`);

    // Click the OIDC login button
    const loginButton = page.locator('button:has-text("Continue with OIDC")');
    await expect(loginButton).toBeVisible();

    // Mock the OIDC redirect to avoid actual auth provider calls
    await page.route('**/auth?**', async (route) => {
      // Simulate successful auth callback
      await route.fulfill({
        status: 302,
        headers: {
          Location: `${BASE_URL}/maestro/auth/callback?code=test-code&state=test-state`,
        },
      });
    });

    // This would normally redirect to the OIDC provider
    await loginButton.click();
  });

  test('should show loading state during authentication callback', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/maestro/auth/callback?code=test&state=test`);

    // Should show loading spinner
    await expect(page.locator('text=Processing authentication')).toBeVisible();

    // Should have spinning animation
    const spinner = page.locator('.animate-spin');
    await expect(spinner).toBeVisible();
  });

  test('should show error state for invalid callback', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/auth/callback?error=access_denied`);

    // Should show error message
    await expect(page.locator('h2')).toContainText('Authentication Error');
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });
});
