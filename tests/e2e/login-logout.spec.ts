/**
 * E2E Tests for Login/Logout Flow
 *
 * Tests the complete user authentication experience
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText(/login|sign in/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/(dashboard|home)/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText(/invalid|incorrect/i);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should show/hide password', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"]');

    // Password should be hidden initially
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button
    await toggleButton.click();

    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle remember me checkbox', async ({ page }) => {
    await page.goto('/login');

    const rememberMeCheckbox = page.locator('input[name="rememberMe"]');

    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
      await expect(rememberMeCheckbox).toBeChecked();
    }
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');

    const forgotPasswordLink = page.locator('a:has-text("Forgot Password")');

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      await expect(page).toHaveURL(/forgot-password/);
    }
  });

  test('should prevent SQL injection in login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', "' OR '1'='1");
    await page.fill('input[name="password"]', "' OR '1'='1");
    await page.click('button[type="submit"]');

    // Should show error, not allow login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should logout successfully', async ({ page }) => {
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    await logoutButton.click();

    // Should redirect to login page
    await expect(page).toHaveURL(/login/);
  });

  test('should clear session on logout', async ({ page }) => {
    await page.locator('button:has-text("Logout"), a:has-text("Logout")').click();

    // Try to access protected page
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should logout from user menu', async ({ page }) => {
    // Click user menu
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]');

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Click logout option
      const logoutOption = page.locator('[role="menuitem"]:has-text("Logout")');
      await logoutOption.click();

      await expect(page).toHaveURL(/login/);
    }
  });
});

test.describe('Session Management', () => {
  test('should maintain session across page refreshes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).not.toHaveURL(/login/);
  });

  test('should redirect to login when session expires', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);

    // Clear cookies to simulate expired session
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab through form fields
    await page.keyboard.press('Tab'); // Email field
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Password field
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Submit button
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    // Check for labels
    await expect(emailInput).toHaveAttribute('aria-label', /.*/);
    await expect(passwordInput).toHaveAttribute('aria-label', /.*/);
  });
});
