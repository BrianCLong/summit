"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Workspace switcher', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('feature.ui.workspaces', 'true');
            window.localStorage.setItem('auth_token', 'test-token');
            const originalFetch = window.fetch;
            window.fetch = (input, init) => {
                if (typeof input === 'string' && input.includes('/users/me')) {
                    return Promise.resolve(new Response(JSON.stringify({
                        id: 'playwright-user',
                        name: 'Playwright User',
                        role: 'analyst',
                        permissions: [],
                    }), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }));
                }
                return originalFetch(input, init);
            };
        });
    });
    (0, test_1.test)('switching workspaces persists layout after reload', async ({ page }) => {
        await page.goto('/analysis/tri-pane');
        await page.waitForSelector('[data-testid="workspace-pill"]');
        await page.getByTestId('workspace-pill').click();
        await page.getByRole('menuitem', { name: /Briefing/ }).click();
        const mapPanel = page.locator('[data-workspace-panel="map"]');
        await (0, test_1.expect)(mapPanel).toHaveAttribute('data-visible', 'false');
        await page.reload();
        await (0, test_1.expect)(page.getByTestId('workspace-pill')).toContainText('Briefing');
        await (0, test_1.expect)(mapPanel).toHaveAttribute('data-visible', 'false');
    });
});
