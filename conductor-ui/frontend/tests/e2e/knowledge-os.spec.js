"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// conductor-ui/frontend/tests/e2e/knowledge-os.spec.ts
const test_1 = require("@playwright/test");
test_1.test.describe('Knowledge OS Views', () => {
    (0, test_1.test)('should allow a semantic search', async ({ page }) => {
        await page.goto('/tools/semantic-search');
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Semantic Search' })).toBeVisible();
        await page.getByRole('button', { name: 'Ask' }).click();
        // Check for a result summary
        await (0, test_1.expect)(page.getByText('This ADR outlines the hybrid data model')).toBeVisible();
    });
});
