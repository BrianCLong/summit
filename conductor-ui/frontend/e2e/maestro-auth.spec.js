"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
test_1.test.describe('Maestro Authentication Flow', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Navigate to Maestro
        await page.goto(`${BASE_URL}/maestro`);
    });
    (0, test_1.test)('should redirect unauthenticated users to login', async ({ page }) => {
        // Should be redirected to authentication page
        await (0, test_1.expect)(page).toHaveURL(/.*\/maestro\/login/);
        // Should show login UI
        await (0, test_1.expect)(page.locator('h2')).toContainText('Sign In to Maestro');
        await (0, test_1.expect)(page.locator('button')).toContainText('Continue with OIDC');
    });
    (0, test_1.test)('should initiate OIDC flow when login button clicked', async ({ page, }) => {
        await page.goto(`${BASE_URL}/maestro/login`);
        // Click the OIDC login button
        const loginButton = page.locator('button:has-text("Continue with OIDC")');
        await (0, test_1.expect)(loginButton).toBeVisible();
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
    (0, test_1.test)('should show loading state during authentication callback', async ({ page, }) => {
        await page.goto(`${BASE_URL}/maestro/auth/callback?code=test&state=test`);
        // Should show loading spinner
        await (0, test_1.expect)(page.locator('text=Processing authentication')).toBeVisible();
        // Should have spinning animation
        const spinner = page.locator('.animate-spin');
        await (0, test_1.expect)(spinner).toBeVisible();
    });
    (0, test_1.test)('should show error state for invalid callback', async ({ page }) => {
        await page.goto(`${BASE_URL}/maestro/auth/callback?error=access_denied`);
        // Should show error message
        await (0, test_1.expect)(page.locator('h2')).toContainText('Authentication Error');
        await (0, test_1.expect)(page.locator('button:has-text("Try Again")')).toBeVisible();
    });
});
