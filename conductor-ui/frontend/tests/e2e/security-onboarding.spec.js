"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// conductor-ui/frontend/tests/e2e/security-onboarding.spec.ts
const test_1 = require("@playwright/test");
test_1.test.describe('Security and Onboarding Flows', () => {
    (0, test_1.test)('should display the onboarding checklist on first run', async ({ page, }) => {
        // This test would require setting a state in local storage to simulate a first run.
        await page.goto('/dashboard');
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Getting Started' })).toBeVisible();
        await (0, test_1.expect)(page.getByLabel('Run a pipeline')).toBeVisible();
    });
    (0, test_1.test)('should allow submitting feedback', async ({ page }) => {
        await page.goto('/dashboard');
        await page
            .locator('.feedback-widget textarea')
            .fill('This is a test feedback message.');
        await page.getByRole('button', { name: 'Send' }).click();
        await (0, test_1.expect)(page.getByText('Thank you for your feedback!')).toBeVisible();
    });
});
