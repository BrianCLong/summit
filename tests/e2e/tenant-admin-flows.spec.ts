import { test, expect } from '@playwright/test';

test.describe('Tenant admin flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON?.();
      if (body?.query?.includes('me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              me: {
                id: 'user-1',
                role: 'ADMIN',
                tenantId: 'tenant-1',
                permissions: ['manage_settings'],
              },
            },
          }),
        });
      }
      return route.continue();
    });

    await page.route('**/api/tenants/tenant-1/settings', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'tenant-1', settings: { theme: 'light', mfaEnforced: false } },
            receipt: {
              id: 'r-1',
              action: 'TENANT_SETTINGS_VIEWED',
              issuedAt: new Date().toISOString(),
              hash: 'hash',
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'tenant-1', settings: { theme: 'dark', mfaEnforced: true } },
          receipt: {
            id: 'r-2',
            action: 'TENANT_SETTINGS_UPDATED',
            issuedAt: new Date().toISOString(),
            hash: 'hash-2',
          },
        }),
      });
    });

    await page.route('**/api/tenants', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'tenant-1', name: 'Acme', slug: 'acme', residency: 'US' },
            receipt: { id: 'r-3', action: 'TENANT_CREATED', issuedAt: new Date().toISOString(), hash: 'hash-3' },
          }),
        });
      }
      return route.continue();
    });

    await page.route('**/api/tenants/tenant-1/disable', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'tenant-1', status: 'disabled' },
          receipt: { id: 'r-4', action: 'TENANT_DISABLED', issuedAt: new Date().toISOString(), hash: 'hash-4' },
        }),
      });
    });
  });

  test('allows admin to create, update settings, and disable tenant', async ({ page }) => {
    await page.goto('/partner-console');

    await expect(page.getByTestId('create-tenant')).toBeVisible();

    await page.fill('[data-testid="create-name"]', 'Acme');
    await page.fill('[data-testid="create-slug"]', 'acme');
    await page.fill('[data-testid="create-residency"]', 'US');
    await page.getByTestId('create-tenant').click();
    await expect(page.getByTestId('status-banner')).toContainText('Tenant created');

    await page.fill('[data-testid="settings-theme"]', 'dark');
    await page.fill('[data-testid="settings-mfa"]', 'true');
    await page.getByTestId('save-settings').click();
    await expect(page.getByTestId('status-banner')).toContainText('Settings updated');

    await page.getByTestId('disable-tenant').click();
    await expect(page.getByTestId('status-banner')).toContainText('Tenant disabled');
  });
});
