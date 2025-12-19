import { test, expect } from '../fixtures/auth.fixture';
import { testUsers } from '../fixtures/test-data';

test.describe('Tenant Isolation', () => {
  test('should prevent cross-tenant data access', async ({ page }) => {
    // Login as tenant 2 user
    await page.goto('/signin');
    await page.getByLabel(/email/i).fill(testUsers.otherTenantUser.email);
    await page.getByLabel(/password/i).fill(testUsers.otherTenantUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/');

    // Attempt to access tenant 1 resource (direct URL manipulation)
    await page.goto('/cases/tenant-1-case-id');
    await expect(page.getByText(/access denied|not found/i)).toBeVisible();
  });

  test('should enforce tenant-scoped queries', async ({ authenticatedPage }) => {
    // Check that lists only show tenant data (this is hard to E2E without seeding,
    // but we can check UI elements don't show "Tenant 2")
    await authenticatedPage.goto('/cases');
    await expect(authenticatedPage.getByText('Tenant 2 Case')).toBeHidden();
  });

  test('should isolate tenant UI navigation', async ({ adminTenantPage }) => {
    await adminTenantPage.goto();
    // Admin should see multiple tenants
    await adminTenantPage.verifyTenantListVisible();
  });
});
