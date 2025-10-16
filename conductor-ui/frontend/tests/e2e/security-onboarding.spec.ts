// conductor-ui/frontend/tests/e2e/security-onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Security and Onboarding Flows', () => {
  test('should display the onboarding checklist on first run', async ({
    page,
  }) => {
    // This test would require setting a state in local storage to simulate a first run.
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Getting Started' }),
    ).toBeVisible();
    await expect(page.getByLabel('Run a pipeline')).toBeVisible();
  });

  test('should allow submitting feedback', async ({ page }) => {
    await page.goto('/dashboard');
    await page
      .locator('.feedback-widget textarea')
      .fill('This is a test feedback message.');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Thank you for your feedback!')).toBeVisible();
  });
});
