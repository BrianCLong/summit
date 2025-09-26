import { test, expect } from '@playwright/test';

const SELECT_TIMEOUT = { timeout: 10000 };

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByTestId('onboarding-wizard')).toBeVisible(SELECT_TIMEOUT);
  });

  test('completes the connect data step and persists progress', async ({ page }) => {
    const sourceTypeField = page.getByTestId('field-connect-data-sourceType');
    await sourceTypeField.click();
    await page.getByRole('option', { name: 'PostgreSQL' }).click();

    await page.getByTestId('field-connect-data-connectionUri').fill('postgresql://demo:demo@localhost:5432/intelgraph');

    await page.getByTestId('save-step-connect-data').click();
    await expect(page.getByTestId('step-status-connect-data')).toContainText(/In Progress|Completed/);

    await page.getByTestId('complete-step-connect-data').click();
    await expect(page.getByTestId('step-status-connect-data')).toHaveText(/Completed/i);

    await expect(page.getByTestId('onboarding-progress-percent')).toContainText('% complete');

    await page.reload();
    await expect(page.getByTestId('onboarding-wizard')).toBeVisible(SELECT_TIMEOUT);
    await expect(page.getByTestId('step-status-connect-data')).toContainText(/Completed/i);
  });
});
