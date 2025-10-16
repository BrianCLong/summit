// conductor-ui/frontend/tests/e2e/admin-views.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Views', () => {
  test('should navigate to the Tenant Admin page and see a title', async ({
    page,
  }) => {
    await page.goto('/admin/tenants');
    await expect(
      page.getByRole('heading', { name: 'Tenant Administration' }),
    ).toBeVisible();
  });

  test('should navigate to the Audit Log page and see a title', async ({
    page,
  }) => {
    await page.goto('/admin/audit');
    await expect(
      page.getByRole('heading', { name: 'Audit Logs' }),
    ).toBeVisible();
  });
});
