import { test, expect } from '@playwright/test';

async function waitForServiceWorker(page) {
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
}

test.describe('Offline mode experience', () => {
  test('dashboard surfaces cached data when offline', async ({ page, context }) => {
    await page.goto('/dashboard');
    await waitForServiceWorker(page);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('📊 Intelligence Command Center')).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('offline-banner')).toBeVisible();
    await expect(page.getByTestId('dashboard-offline-indicator')).toBeVisible();
    await expect(page.getByText('📊 Intelligence Command Center')).toBeVisible();

    await context.setOffline(false);
  });

  test('ingest wizard progress persists during offline usage', async ({ page, context }) => {
    await page.goto('/ingest/wizard');
    await waitForServiceWorker(page);

    await expect(page.getByText('Data Ingest Wizard')).toBeVisible();

    await page.getByLabel('Investigation Name').fill('Offline Case Study');
    await page.getByLabel('Description').fill('Testing offline ingest wizard resilience.');
    await page.getByRole('button', { name: 'Create Investigation' }).click();

    await expect(page.getByText('Now let\'s add some entities', { exact: false })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('wizard-offline-alert')).toBeVisible();
    await expect(page.getByText('Now let\'s add some entities', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Entity Name')).toBeVisible();

    await context.setOffline(false);
  });
});
