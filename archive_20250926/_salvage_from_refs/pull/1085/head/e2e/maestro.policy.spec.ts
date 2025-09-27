// =============================================
// File: e2e/maestro.policy.spec.ts
// =============================================
import { test, expect } from ' @playwright/test';

const gotoWebTab = async (page: any) => {
  await page.goto('/maestro');
  await page.getByRole('tab', { name: 'Web' }).click();
};

test.describe('Maestro — Policy gate & elevation', () => {
  test('Attach-to-Case denial shows banner and elevation flow works', async ({ page }) => {
    await gotoWebTab(page);

    // Select first interface and run orchestrator
    const interfaces = page.getByRole('checkbox');
    await interfaces.first().check();
    await page.getByRole('button', { name: 'Run' }).click();

    // Wait for Synthesized section
    await expect(page.getByRole('heading', { name: 'Synthesized' })).toBeVisible();

    // Attempt attach to case → PolicyButton checks '/policy/check' and MSW denies
    await page.getByRole('button', { name: 'Attach to Case' }).click();

    // Denial banner visible
    await expect(page.getByText('Action blocked')).toBeVisible();
    await expect(page.getByText('Attach restricted to Gold tier')).toBeVisible();

    // Open elevation dialog
    await page.getByRole('button', { name: 'Request elevation' }).click();

    // Fill and submit
    await page.getByRole('textbox').fill('Investigative case requires attachment for audit.');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Ticket confirmation
    await expect(page.getByText(/Elevation submitted · Ticket/)).toBeVisible();
  });
});
