import { test, expect } from '@playwright/test';

// TODO: Enable this test once the apps/web environment is stable and can be served locally.
// Currently skipped due to missing dev dependencies (vite, rxjs) and peer dependency conflicts.

test.describe('Maestro Run Console', () => {
  test.skip('should execute a run and display results', async ({ page }) => {
    // 1. Navigate to the console
    await page.goto('/maestro-run-console');

    // 2. Verify initial state
    await expect(page.getByRole('heading', { name: 'Maestro Run Console' })).toBeVisible();
    await expect(page.getByPlaceholder('Describe what you want Maestro to do')).toBeVisible();

    // 3. Enter a request
    await page.getByPlaceholder('Describe what you want Maestro to do').fill('Test Playwright Run');

    // 4. Trigger the run
    await page.getByRole('button', { name: 'Run with Maestro' }).click();

    // 5. Verify loading state (optional, might be too fast with mock)
    // await expect(page.getByText('Running…')).toBeVisible();

    // 6. Verify completion and results
    // Wait for the task list to populate
    await expect(page.getByText('Plan execution strategy')).toBeVisible();
    await expect(page.getByText('Succeeded').first()).toBeVisible();

    // Verify cost summary
    await expect(page.getByText('Estimated Cost')).toBeVisible();
    await expect(page.getByText('$0.0452')).toBeVisible(); // Matches mock data

    // 7. Verify outputs
    await expect(page.getByText('Execution Plan')).toBeVisible();
  });
});
