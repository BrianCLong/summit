"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('MC Sovereign Console v0.3.9', () => {
    (0, test_1.test)('toggles flags with persisted-only & audit headers', async ({ page, }) => {
        await page.goto('/');
        // Pretend Toggle
        await page.getByText('Feature Flags').scrollIntoViewIfNeeded();
        const save = page.getByRole('button', { name: 'Save Flags' });
        const [req] = await Promise.all([
            page.waitForRequest((r) => r.url().includes('/api/mc/config/flags') && r.method() === 'POST'),
            save.click(),
        ]);
        (0, test_1.expect)(req.headers()['x-persisted-only']).toBe('true');
        (0, test_1.expect)(req.headers()['x-provenance-capture']).toBe('true');
    });
    (0, test_1.test)('composite weights saved via persisted mutation', async ({ page }) => {
        await page.goto('/');
        const save = page.getByRole('button', { name: 'Save Weights' });
        const [req] = await Promise.all([
            page.waitForRequest((r) => r.postData()?.includes('weights')),
            save.click(),
        ]);
        (0, test_1.expect)(req.url()).toContain('/api/mc/canary/weights');
    });
});
