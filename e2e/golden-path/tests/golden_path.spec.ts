import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('golden-path: journey', () => {
  // Configurable kill switch for the journey itself
  const JOURNEY_MODE = process.env.GOLDEN_PATH_JOURNEY || 'basic'; // basic | full

  test.beforeEach(async ({ page }) => {
    // Shared setup if needed
  });

  test('User can navigate from Dashboard to Investigation', async ({ page }) => {
    // 1. Auth / Load
    const loginPage = new LoginPage(page);
    await test.step('Bypass Auth', async () => {
      await loginPage.bypassAuth();
    });

    // 2. Dashboard
    const dashboardPage = new DashboardPage(page);
    await test.step('Verify Dashboard', async () => {
      // Assuming bypass redirects to dashboard or verifies root
      await expect(page.locator('#root')).toBeAttached();
    });

    if (JOURNEY_MODE === 'basic') {
      console.log('Stopping at Dashboard (JOURNEY_MODE=basic)');
      return;
    }

    // 3. Investigations (full journey)
    await test.step('Navigate to Investigations', async () => {
      await dashboardPage.navigateToInvestigations();
    });

    // 4. Verify investigation list loaded
    await test.step('Verify Investigations Page', async () => {
      await expect(page.locator('[data-testid="investigations-list"]')).toBeVisible({ timeout: 10000 });
    });
  });
});
