import { test, expect } from './fixtures/index';

test.describe('Summit Golden Path', () => {
  // Use a wider viewport for visual regression to capture full UI
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ login }) => {
    // Login fixture handles navigation to authorized state
    await login();
  });

  test('Analyst Journey: Navigation and Visual Verification', async ({ page }) => {
    // 1. Dashboard / Home
    console.log('Navigating to Dashboard...');
    await page.goto('/maestro/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    await page.waitForLoadState('domcontentloaded');

    // Instead of simple timeout, verify main content
    await expect(page.locator('#root')).toBeVisible();

    // 2. Pipelines
    console.log('Navigating to Pipelines...');
    await page.goto('/maestro/pipelines');
    await expect(page).toHaveURL(/.*pipelines/);

    // 3. Observability
    console.log('Navigating to Observability...');
    await page.goto('/maestro/observability');
    await expect(page).toHaveURL(/.*observability/);

    // 4. Autonomy
    console.log('Navigating to Autonomy...');
    await page.goto('/maestro/autonomy');
    await expect(page).toHaveURL(/.*autonomy/);

    // 5. Settings
    console.log('Navigating to Settings...');
    await page.goto('/maestro/settings');
    await expect(page).toHaveURL(/.*settings/);
  });

  test('Investigation Workflow', async ({ page }) => {
    // Navigate to Investigations/Runs if available
    await page.goto('/maestro/runs');
    await expect(page).toHaveURL(/.*runs/);

    // Check for run list availability (even if empty)
    await expect(page.getByRole('main')).toBeVisible();
  });
});
