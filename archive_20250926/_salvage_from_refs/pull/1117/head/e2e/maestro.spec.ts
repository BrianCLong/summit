// =============================================
// File: e2e/maestro.spec.ts (Playwright)
// =============================================
import { test, expect } from '@playwright/test';

test.describe('Maestro', () => {
  test('renders and runs a routing preview + execute', async ({ page }) => {
    await page.goto('/maestro');
    await expect(page.getByRole('heading', { name: 'Maestro' })).toBeVisible();
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByText('Run Timeline')).toBeVisible();
  });

  test('web orchestrator runs and shows synthesized', async ({ page }) => {
    await page.goto('/maestro');
    await page.getByRole('tab', { name: 'Web' }).click();
    await page.getByLabel('SERP Search').check();
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByRole('heading', { name: 'Synthesized' })).toBeVisible();
  });

  test('keyboard navigation works as expected', async ({ page }) => {
    await page.goto('/maestro');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Task')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Run' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Select GPT‑4o‑mini')).toBeFocused();
    await page.keyboard.press('Space'); // Check the checkbox
    await expect(page.getByLabel('Select GPT‑4o‑mini')).toBeChecked();
  });

  test('policy denial is displayed for "Attach to Case" action', async ({ page }) => {
    await page.goto('/maestro');
    await page.getByRole('tab', { name: 'Web' }).click();
    await page.getByLabel('SERP Search').check();
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByRole('heading', { name: 'Synthesized' })).toBeVisible();

    // Click the "Attach to Case" button, which should trigger a policy denial in mock
    await page.getByRole('button', { name: 'Attach to Case' }).click();

    // Assert that the policy denial message is displayed
    await expect(page.getByText('Export limited to Gold tier')).toBeVisible();
    await expect(page.getByText('Contact: secops@intelgraph.local')).toBeVisible();
  });
});
