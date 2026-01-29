import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { GraphExplorerPage } from '../pages/GraphExplorerPage';

test.describe('Golden Path Journey', () => {
  // Kill switch for full journey
  test.skip(process.env.GOLDEN_PATH_JOURNEY !== 'full', 'GOLDEN_PATH_JOURNEY!=full');

  test('User can login and navigate to dashboard and graph', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const graphPage = new GraphExplorerPage(page);

    await test.step('Login', async () => {
      await loginPage.goto();
      await loginPage.login();
    });

    await test.step('Navigate to Dashboard', async () => {
       await dashboardPage.goto();
       await dashboardPage.verifyLoaded();
    });

    await test.step('Navigate to Graph Explorer', async () => {
      await graphPage.goto();
      await graphPage.verifyLoaded();
    });
  });
});
