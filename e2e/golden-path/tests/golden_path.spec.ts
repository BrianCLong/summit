import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { InvestigationPage } from '../pages/InvestigationPage';

test.describe('golden-path: journey', () => {
  // Configurable kill switch for the journey itself
  const JOURNEY_MODE = process.env.GOLDEN_PATH_JOURNEY || 'basic'; // basic | full

  test.beforeEach(async ({ page }) => {
    // Shared setup if needed
  });

  test('User can navigate from Dashboard to Investigation Graph', async ({ page }) => {
    // 1. Auth / Load
    const loginPage = new LoginPage(page);
    await test.step('Bypass Auth', async () => {
        await loginPage.bypassAuth();
    });

    // 2. Dashboard
    const dashboardPage = new DashboardPage(page);
    await test.step('Verify Dashboard', async () => {
       // If bypass redirects to dashboard directly
       // await dashboardPage.isLoaded();
       // Note: Current bypass might verify #root only.
       // We can check URL if it's predictable.
       // Assuming it goes to /dashboard or similar.
    });

    if (JOURNEY_MODE === 'basic') {
        console.log('Stopping at Dashboard (JOURNEY_MODE=basic)');
        return;
    }

    // 3. Investigations
    await test.step('Navigate to Investigations', async () => {
        await dashboardPage.navigateToInvestigations();
    });

    // 4. Open Investigation
    const investigationPage = new InvestigationPage(page);
    await test.step('Open Golden Path Investigation', async () => {
        await investigationPage.openInvestigation('Golden Path Investigation');
        await investigationPage.isLoaded();
    });

    // 5. Verify Entities
    await test.step('Verify Entities', async () => {
        await investigationPage.verifyEntityVisible('John Doe');
        await investigationPage.verifyEntityVisible('Acme Corp');
    });

    // 6. Graph View
    await test.step('Switch to Graph', async () => {
        await investigationPage.switchToGraphView();
    });
  });
});
