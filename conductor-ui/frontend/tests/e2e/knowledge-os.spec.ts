// conductor-ui/frontend/tests/e2e/knowledge-os.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Knowledge OS Views', () => {
  test('should allow a semantic search', async ({ page }) => {
    await page.goto('/tools/semantic-search');
    await expect(
      page.getByRole('heading', { name: 'Semantic Search' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Ask' }).click();

    // Check for a result summary
    await expect(
      page.getByText('This ADR outlines the hybrid data model'),
    ).toBeVisible();
  });
});
