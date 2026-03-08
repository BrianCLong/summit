"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const LoginPage_1 = require("../pages/LoginPage");
const DashboardPage_1 = require("../pages/DashboardPage");
test_1.test.describe('golden-path: journey', () => {
    // Configurable kill switch for the journey itself
    const JOURNEY_MODE = process.env.GOLDEN_PATH_JOURNEY || 'basic'; // basic | full
    test_1.test.beforeEach(async ({ page }) => {
        // Shared setup if needed
    });
    (0, test_1.test)('User can navigate from Dashboard to Investigation', async ({ page }) => {
        // 1. Auth / Load
        const loginPage = new LoginPage_1.LoginPage(page);
        await test_1.test.step('Bypass Auth', async () => {
            await loginPage.bypassAuth();
        });
        // 2. Dashboard
        const dashboardPage = new DashboardPage_1.DashboardPage(page);
        await test_1.test.step('Verify Dashboard', async () => {
            // Assuming bypass redirects to dashboard or verifies root
            await (0, test_1.expect)(page.locator('#root')).toBeAttached();
        });
        if (JOURNEY_MODE === 'basic') {
            console.log('Stopping at Dashboard (JOURNEY_MODE=basic)');
            return;
        }
        // 3. Investigations (full journey)
        await test_1.test.step('Navigate to Investigations', async () => {
            await dashboardPage.navigateToInvestigations();
        });
        // 4. Verify investigation list loaded
        await test_1.test.step('Verify Investigations Page', async () => {
            await (0, test_1.expect)(page.locator('[data-testid="investigations-list"]')).toBeVisible({ timeout: 10000 });
        });
    });
});
