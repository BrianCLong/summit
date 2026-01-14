import { test, expect } from './fixtures.js';

test.describe('Summit Console Smoke Test', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Go to home
    await authenticatedPage.goto('/');
  });

  test('Dashboard loads', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveTitle(/Summit|IntelGraph/i);
    // Check for a key element that signifies the dashboard is loaded
    // await expect(authenticatedPage.getByTestId('dashboard-header')).toBeVisible();
  });

  test('Maestro navigation', async ({ authenticatedPage }) => {
    // Navigate to Maestro
    // This assumes a sidebar or nav link exists
    // await authenticatedPage.getByRole('link', { name: /Maestro/i }).click();
    // await expect(authenticatedPage).toHaveURL(/\/maestro/);
  });

  test('IntelGraph navigation', async ({ authenticatedPage }) => {
    // Navigate to Graph
    // await authenticatedPage.getByRole('link', { name: /Graph/i }).click();
    // await expect(authenticatedPage).toHaveURL(/\/graph/);
  });

  test('First-run funnel entry', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('link', { name: /setup/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/setup/);

    await authenticatedPage.getByRole('link', { name: /continue setup/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/data\/sources/);
  });
});
