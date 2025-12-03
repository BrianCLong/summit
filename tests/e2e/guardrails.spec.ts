import { test, expect } from '@playwright/test';

/**
 * E2E Guardrails Test
 *
 * Validates negative paths and chaos inputs for the "Golden Path".
 * Note: Some tests mock API responses or use APIRequestContext directly to inject chaos.
 */
test.describe('Golden Path Guardrails - Negative & Chaos Tests', () => {

  // 3. Inconsistent Session States
  test('should redirect to login when session is invalid', async ({ page }) => {
    // Navigate to a protected page without auth
    // We clear cookies to ensure no session
    await page.context().clearCookies();

    await page.goto('/investigations'); // Protected route

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  // 4. Malformed AI Prompts (UI resilience)
  test('should handle extremely long AI inputs gracefully', async ({ page }) => {
    // Assuming we have a way to bypass auth or use the "dev" user if available
    // For E2E we usually need a logged in state.
    // We'll reuse the logic from copilot-mvp.spec.ts to bypass if possible
    // or assume we are redirected to login if we can't login.

    // Ideally we'd use a global setup for login, but for now we'll skip if not logged in.
    // However, let's try to inject a token if possible or just use the page.

    // If the test environment starts with a fresh state, we might need to login.
    // check copilot-mvp.spec.ts - it does `await page.goto('/investigations/test-investigation-001')`
    // and expects `investigation-loaded`. This implies some auth bypass or seed.

    await page.goto('/investigations/test-investigation-001');

    // If redirected to login, we can't test UI.
    // But let's assume the test env handles it (like in copilot-mvp.spec.ts).

    // Wait for page load - we expect this to succeed or fail the test explicitly
    // If auth is required and we are not logged in, this should fail, alerting us to a regression
    // in test environment or "Golden Path" accessibility.
    await page.waitForSelector('[data-testid="investigation-loaded"]', { timeout: 10000 });

    // Open Copilot
    await page.click('[data-testid="copilot-toggle"]');

    // Input huge string
    const queryInput = page.locator('textarea[placeholder*="Ask me anything"]');
    const hugeText = 'A'.repeat(10000);
    await queryInput.fill(hugeText);

    // Click Preview
    await page.click('button:has-text("Preview Query")');

    // Should not crash. Expect either an error message or a successful processing (if truncated).
    // Or just "Query Ready" if it handled it.
    // We check for "Server Error" or crash.
    const crashIndicator = page.locator('text=Internal Server Error');
    await expect(crashIndicator).not.toBeVisible();
  });

});
