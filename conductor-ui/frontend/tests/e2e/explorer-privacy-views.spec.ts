// conductor-ui/frontend/tests/e2e/explorer-privacy-views.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Explorer and Privacy Views', () => {
  test('should navigate to the Graph Explorer and see a title', async ({
    page,
  }) => {
    await page.goto('/explorer');
    await expect(
      page.getByRole('heading', { name: 'Graph Explorer' }),
    ).toBeVisible();
  });

  test('should navigate to the Privacy Console and see a title', async ({
    page,
  }) => {
    await page.goto('/admin/privacy');
    await expect(
      page.getByRole('heading', { name: 'Privacy & Retention Console' }),
    ).toBeVisible();
  });
});
