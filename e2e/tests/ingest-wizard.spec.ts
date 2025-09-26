import { test, expect } from '@playwright/test';
import { performLogin } from '../utils/auth';
import { runAccessibilityScan } from '../utils/accessibility';
import { registerGraphQLMocks } from '../utils/graphql';

test.describe('Ingestion wizard workflow', () => {
  test.beforeEach(async ({ page }) => {
    await registerGraphQLMocks(page);
    await performLogin(page);
    await page.goto('/ingest/wizard');
    await expect(page.getByRole('heading', { name: 'Data Ingestion Control Center' })).toBeVisible();
  });

  test('walks through configuration, DPIA, and review steps', async ({ page }) => {
    await runAccessibilityScan(page, { context: '[data-testid="ingest-wizard-container"]' });

    await page.getByPlaceholder('Enter descriptive name for data source').fill('National Energy Grid');
    await page.getByRole('button', { name: 'Select source type' }).click();
    await page.getByRole('option', { name: 'CSV File' }).click();
    await page.getByRole('button', { name: 'Select license template' }).click();
    await page.getByRole('option', { name: 'Creative Commons Attribution 4.0' }).click();
    await page.getByRole('button', { name: 'Next: DPIA Assessment' }).click();

    await page.getByPlaceholder('Describe the purpose and legal basis for processing this data').fill(
      'Monitor cross-border power distribution for resiliency analytics.'
    );
    await page.getByText('Personal identifiers').click();
    await page.getByText('Location data').click();
    await page.getByRole('button', { name: 'Select risk level' }).click();
    await page.getByRole('option', { name: 'High - Financial/health data' }).click();
    await page.getByText('Encryption at rest').click();
    await page.getByText('Access controls').click();
    await page.getByRole('button', { name: 'Next: Review & Submit' }).click();

    await expect(page.getByRole('heading', { name: 'Review & Submit' })).toBeVisible();
    await expect(page.getByText('National Energy Grid')).toBeVisible();
    await expect(page.getByText('Creative Commons Attribution 4.0')).toBeVisible();
    await expect(page.getByText('PII Classification: high', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Complete Setup' }).click();
    await expect(page.getByTestId('ingest-success-alert')).toContainText('National Energy Grid');
    await expect(page.getByRole('button', { name: 'Start new ingestion run' })).toBeEnabled();
  });

  test('allows analysts to relaunch the wizard after completion', async ({ page }) => {
    await page.getByPlaceholder('Enter descriptive name for data source').fill('Satellite Imagery Feed');
    await page.getByRole('button', { name: 'Select source type' }).click();
    await page.getByRole('option', { name: 'REST API' }).click();
    await page.getByRole('button', { name: 'Next: DPIA Assessment' }).click();
    await page.getByPlaceholder('Describe the purpose and legal basis for processing this data').fill(
      'Augment situational awareness dashboards.'
    );
    await page.getByText('Behavioral data').click();
    await page.getByRole('button', { name: 'Select risk level' }).click();
    await page.getByRole('option', { name: 'Medium - Contact info' }).click();
    await page.getByText('Audit logging').click();
    await page.getByRole('button', { name: 'Next: Review & Submit' }).click();
    await page.getByRole('button', { name: 'Complete Setup' }).click();

    await expect(page.getByTestId('ingest-success-alert')).toBeVisible();
    await page.getByRole('button', { name: 'Start new ingestion run' }).click();
    await expect(page.getByTestId('ingest-wizard-container')).toBeVisible();
  });
});
