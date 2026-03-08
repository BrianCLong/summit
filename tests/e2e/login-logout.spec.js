"use strict";
/**
 * E2E Tests for Login/Logout Flow
 *
 * Tests the complete user authentication experience
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Login Flow', () => {
    (0, test_1.test)('should display login page', async ({ page }) => {
        await page.goto('/login');
        await (0, test_1.expect)(page.locator('h1')).toContainText(/login|sign in/i);
        await (0, test_1.expect)(page.locator('input[name="email"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('input[name="password"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('button[type="submit"]')).toBeVisible();
    });
    (0, test_1.test)('should login with valid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'TestPassword123!');
        await page.click('button[type="submit"]');
        // Should redirect to dashboard after successful login
        await (0, test_1.expect)(page).toHaveURL(/\/(dashboard|home)/);
    });
    (0, test_1.test)('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'invalid@example.com');
        await page.fill('input[name="password"]', 'WrongPassword');
        await page.click('button[type="submit"]');
        // Should show error message
        await (0, test_1.expect)(page.locator('[role="alert"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[role="alert"]')).toContainText(/invalid|incorrect/i);
    });
    (0, test_1.test)('should validate required fields', async ({ page }) => {
        await page.goto('/login');
        // Try to submit without filling fields
        await page.click('button[type="submit"]');
        // Should show validation errors
        const emailInput = page.locator('input[name="email"]');
        const passwordInput = page.locator('input[name="password"]');
        await (0, test_1.expect)(emailInput).toHaveAttribute('required', '');
        await (0, test_1.expect)(passwordInput).toHaveAttribute('required', '');
    });
    (0, test_1.test)('should show/hide password', async ({ page }) => {
        await page.goto('/login');
        const passwordInput = page.locator('input[name="password"]');
        const toggleButton = page.locator('button[aria-label*="password"]');
        // Password should be hidden initially
        await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'password');
        // Click toggle button
        await toggleButton.click();
        // Password should be visible
        await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'text');
        // Click again to hide
        await toggleButton.click();
        await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'password');
    });
    (0, test_1.test)('should handle remember me checkbox', async ({ page }) => {
        await page.goto('/login');
        const rememberMeCheckbox = page.locator('input[name="rememberMe"]');
        if (await rememberMeCheckbox.isVisible()) {
            await rememberMeCheckbox.check();
            await (0, test_1.expect)(rememberMeCheckbox).toBeChecked();
        }
    });
    (0, test_1.test)('should navigate to forgot password', async ({ page }) => {
        await page.goto('/login');
        const forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
        if (await forgotPasswordLink.isVisible()) {
            await forgotPasswordLink.click();
            await (0, test_1.expect)(page).toHaveURL(/forgot-password/);
        }
    });
    (0, test_1.test)('should prevent SQL injection in login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', "' OR '1'='1");
        await page.fill('input[name="password"]', "' OR '1'='1");
        await page.click('button[type="submit"]');
        // Should show error, not allow login
        await (0, test_1.expect)(page).toHaveURL(/login/);
    });
});
test_1.test.describe('Logout Flow', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'TestPassword123!');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(dashboard|home)/);
    });
    (0, test_1.test)('should logout successfully', async ({ page }) => {
        // Find and click logout button
        const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
        await logoutButton.click();
        // Should redirect to login page
        await (0, test_1.expect)(page).toHaveURL(/login/);
    });
    (0, test_1.test)('should clear session on logout', async ({ page }) => {
        await page.locator('button:has-text("Logout"), a:has-text("Logout")').click();
        // Try to access protected page
        await page.goto('/dashboard');
        // Should redirect to login
        await (0, test_1.expect)(page).toHaveURL(/login/);
    });
    (0, test_1.test)('should logout from user menu', async ({ page }) => {
        // Click user menu
        const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]');
        if (await userMenu.isVisible()) {
            await userMenu.click();
            // Click logout option
            const logoutOption = page.locator('[role="menuitem"]:has-text("Logout")');
            await logoutOption.click();
            await (0, test_1.expect)(page).toHaveURL(/login/);
        }
    });
});
test_1.test.describe('Session Management', () => {
    (0, test_1.test)('should maintain session across page refreshes', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'TestPassword123!');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(dashboard|home)/);
        // Refresh page
        await page.reload();
        // Should still be logged in
        await (0, test_1.expect)(page).not.toHaveURL(/login/);
    });
    (0, test_1.test)('should redirect to login when session expires', async ({ page }) => {
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
        await (0, test_1.expect)(page).toHaveURL(/login/);
    });
});
test_1.test.describe('Accessibility', () => {
    (0, test_1.test)('should be keyboard navigable', async ({ page }) => {
        await page.goto('/login');
        // Tab through form fields
        await page.keyboard.press('Tab'); // Email field
        await (0, test_1.expect)(page.locator('input[name="email"]')).toBeFocused();
        await page.keyboard.press('Tab'); // Password field
        await (0, test_1.expect)(page.locator('input[name="password"]')).toBeFocused();
        await page.keyboard.press('Tab'); // Submit button
        await (0, test_1.expect)(page.locator('button[type="submit"]')).toBeFocused();
    });
    (0, test_1.test)('should have proper ARIA labels', async ({ page }) => {
        await page.goto('/login');
        const emailInput = page.locator('input[name="email"]');
        const passwordInput = page.locator('input[name="password"]');
        // Check for labels
        await (0, test_1.expect)(emailInput).toHaveAttribute('aria-label', /.*/);
        await (0, test_1.expect)(passwordInput).toHaveAttribute('aria-label', /.*/);
    });
});
