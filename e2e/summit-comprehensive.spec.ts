import { test, expect } from '@playwright/test';

test.describe('Summit Comprehensive E2E Flow', () => {
  test('should complete a full user journey: login -> dashboard -> cases', async ({ page }) => {
    // 1. Navigate to Login
    await page.goto('/');

    // If redirected to login, perform login
    // We check if we are on login page by looking for specific elements
    const isLoginPage = await page.getByLabel('Email').isVisible();

    if (isLoginPage) {
        console.log('On Login Page, performing login...');
        await page.getByLabel('Email').fill('sarah.chen@intelgraph.com');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: /Sign In/i }).click();
    } else {
        console.log('Already logged in or not on login page.');
    }

    // 2. Verify Dashboard Load
    // We expect to be on the dashboard or root
    // The exact URL might vary depending on redirects, but we check for dashboard content
    await expect(page.getByText('IntelGraph Platform').first()).toBeVisible({ timeout: 10000 });

    // 3. Navigate to Cases
    // Try to find the link in navigation
    // It might be inside a drawer or sidebar
    const casesLink = page.getByRole('link', { name: /Cases/i });

    if (!await casesLink.isVisible()) {
        const menuButton = page.getByLabel('Open navigation menu');
        if (await menuButton.isVisible()) {
            await menuButton.click();
            await expect(casesLink).toBeVisible();
        }
    }

    await casesLink.click();

    // 4. Verify Cases Page
    await expect(page).toHaveURL(/\/cases/);
    await expect(page.getByRole('heading', { name: /Case Management/i })).toBeVisible();

    // Check for search input
    const searchInput = page.getByPlaceholderText(/Search cases/i);
    await expect(searchInput).toBeVisible();

    // 5. Verify Filters
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();

    // 6. Test Search (using the mock data knowledge)
    // We know 'Suspicious Network Activity' is likely in the mock data
    await searchInput.fill('Suspicious');

    // Verify that at least one card is visible
    // The implementation uses Card component with title inside h3
    await expect(page.locator('h3').first()).toBeVisible();
  });
});
