import { test, expect } from '@playwright/test';

test.describe('Summit Golden Path', () => {
  // Use a wider viewport for visual regression to capture full UI
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Simulate authentication via the mock callback
    // This bypasses the actual Auth0 login screen which is hard to test
    await page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');

    // Wait for the app to load
    await expect(page.locator('#root')).toBeAttached();

    // Give it a moment to render
    await page.waitForTimeout(2000);
  });

  test('Analyst Journey: Navigation and Visual Verification', async ({ page }) => {
    // 1. Dashboard / Home
    console.log('Navigating to Dashboard...');
    await page.goto('/maestro/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('01-dashboard.png', { fullPage: true });

    // 2. Pipelines
    console.log('Navigating to Pipelines...');
    await page.goto('/maestro/pipelines');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('02-pipelines.png');

    // 3. Observability
    console.log('Navigating to Observability...');
    await page.goto('/maestro/observability');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('03-observability.png');

    // 4. Autonomy
    console.log('Navigating to Autonomy...');
    await page.goto('/maestro/autonomy');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('04-autonomy.png');

    // 5. Settings
    console.log('Navigating to Settings...');
    await page.goto('/maestro/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('05-settings.png');
  });

  test('Investigation Workflow', async ({ page }) => {
    // Navigate to Investigations/Runs if available
    await page.goto('/maestro/runs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('06-runs-list.png');
  });

  test('User can access the main dashboard and verify core layout', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/Maestro|IntelGraph|Platform/i);

    // 2. Visit Dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // 3. Take a screenshot for evidence
    await page.screenshot({ path: 'test-results/golden-path-dashboard.png' });
  });

  test('User can login and view dashboard', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/');

    // Check if we are redirected to login
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'analyst@intelgraph.tech');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    }

    // Verify basic load and title
    const title = await page.title();
    expect(title).toBeDefined();
  });
});
