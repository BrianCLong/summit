import { test, expect, Page, Route, Request } from '@playwright/test';

type RbacOverride = Partial<{
  id: string;
  displayName: string;
  role: string;
  primaryRole: string;
  roles: string[];
  personas: string[];
  permissions: string[];
  featureFlags: Array<{ key: string; enabled: boolean }>;
}>;

const baseUser = {
  id: 'user-e2e',
  displayName: 'E2E User',
  role: 'analyst',
  primaryRole: 'analyst',
  roles: ['analyst'],
  personas: [] as string[],
  permissions: [] as string[],
  featureFlags: [] as Array<{ key: string; enabled: boolean }>,
};

async function interceptRbac(page: Page, overrides: RbacOverride) {
  const payload = { ...baseUser, ...overrides };
  await page.route('**/graphql*', async (route: Route, request: Request) => {
    const method = request.method();
    const postData = request.postData();
    const url = request.url();

    const requestContainsRbacQuery = () => {
      if (postData) {
        return postData.includes('GetRbacContext');
      }
      return url.includes('GetRbacContext');
    };

    if (requestContainsRbacQuery()) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { me: payload } }),
      });
      return;
    }

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 200, body: 'OK' });
      return;
    }

    await route.continue();
  });
}

test.describe('Role-based dashboard RBAC rendering', () => {
  test('shows analyst dashboard by default', async ({ page }) => {
    await interceptRbac(page, {});
    await page.goto('/dashboard');
    await expect(page.getByTestId('analyst-dashboard')).toBeVisible();
  });

  test('shows admin controls for admin role', async ({ page }) => {
    await interceptRbac(page, { role: 'admin', primaryRole: 'admin', roles: ['admin'] });
    await page.goto('/dashboard');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    await expect(page.getByTestId('ml-tools-panel')).toBeVisible();
  });

  test('locks deployment controls when maestro persona lacks permission', async ({ page }) => {
    await interceptRbac(page, {
      personas: ['maestro-conductor'],
      permissions: ['ml:manage'],
      featureFlags: [
        { key: 'ml-tools', enabled: true },
        { key: 'deployment-controls', enabled: false },
      ],
    });
    await page.goto('/dashboard');
    await expect(page.getByTestId('maestro-dashboard')).toBeVisible();
    await expect(page.getByTestId('maestro-ml-tools')).toBeVisible();
    await expect(page.getByTestId('maestro-deploy-locked')).toBeVisible();
  });
});
