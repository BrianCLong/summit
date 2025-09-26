import { test, expect, Page } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const E2E_USER = process.env.E2E_USER || 'admin@example.com';
const E2E_PASS = process.env.E2E_PASS || 'password123';

async function login(page: Page) {
  await page.goto(WEB_URL);
  if (await page.getByLabel('Email').isVisible().catch(() => false)) {
    await page.getByLabel('Email').fill(E2E_USER);
    await page.getByLabel('Password').fill(E2E_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();
  }
  await expect(page.getByText('Intelligence Command Center')).toBeVisible();
}

const ingestStepTitles = [
  'Guided ingest setup',
  'Demo mode shortcut',
  'Track your progress',
  'Complete each task',
];

const queryBuilderStepTitles = [
  'Flexible query builder',
  'Keyboard friendly input',
  'Pick fields and operators',
  'Review active filters',
];

test.describe('guided onboarding tours', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('walks through the ingest wizard tour', async ({ page }) => {
    await page.getByTestId('open-ingest-wizard').click();
    await expect(page.getByRole('heading', { name: 'IntelGraph Quick Start' })).toBeVisible();

    const tourButton = page.locator('[data-tour-id="ingest-wizard-tour-button"]');
    await tourButton.click();
    await expect(page.getByText('This dialog walks you through importing new intelligence data')).toBeVisible();

    for (let i = 0; i < ingestStepTitles.length; i += 1) {
      const title = ingestStepTitles[i];
      const dialog = page.getByRole('dialog', { name: title });
      await expect(dialog).toBeVisible();
      if (i < ingestStepTitles.length - 1) {
        await dialog.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('dialog', { name: ingestStepTitles[i + 1] })).toBeVisible();
      } else {
        await dialog.getByRole('button', { name: 'Done' }).click();
      }
    }

    await expect(tourButton).toHaveText(/Replay tour/i);
    await page.getByRole('button', { name: 'Close wizard' }).click();
    await expect(
      page.getByText('Guided tour completed. You can replay it from within the wizard.'),
    ).toBeVisible();
  });

  test('guides the query builder tour', async ({ page }) => {
    const builderButton = page.locator('[data-tour-id="query-builder-tour-button"]');
    await expect(builderButton).toBeVisible();
    await builderButton.click();
    await expect(
      page.getByText('Build complex search filters with chips or using the accessible quick search field.'),
    ).toBeVisible();

    for (let i = 0; i < queryBuilderStepTitles.length; i += 1) {
      const title = queryBuilderStepTitles[i];
      const dialog = page.getByRole('dialog', { name: title });
      await expect(dialog).toBeVisible();
      if (i < queryBuilderStepTitles.length - 1) {
        await dialog.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('dialog', { name: queryBuilderStepTitles[i + 1] })).toBeVisible();
      } else {
        await dialog.getByRole('button', { name: 'Done' }).click();
      }
    }

    await expect(builderButton).toHaveText(/Replay tour/i);
    await expect(
      page.getByText('Query builder tour completed. Replay it from the guided tour button inside the card.'),
    ).toBeVisible();
  });
});
