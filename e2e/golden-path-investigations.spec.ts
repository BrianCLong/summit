import { test, expect, type Page } from '@playwright/test';

/**
 * Golden-path Playwright tests for the investigation workflow.
 *
 * Covers: Investigation creation -> Entity addition -> Relationship -> Result
 * Ref: https://github.com/BrianCLong/summit/issues/11176
 *
 * Deterministic: No reliance on external services. Uses mock auth via
 * localStorage injection. All selectors use [data-testid] attributes.
 */

const TEST_USER = {
  id: 'e2e-analyst-001',
  email: 'analyst@intelgraph.test',
  roles: ['analyst'],
  token: 'mock-e2e-jwt-token',
};

async function authenticateViaLocalStorage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((user) => {
    localStorage.setItem('auth_token', user.token);
    localStorage.setItem('user', JSON.stringify(user));
  }, TEST_USER);
}

test.describe('Golden Path: Investigation Workflow', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await authenticateViaLocalStorage(page);
  });

  test('create investigation, add entities and relationship, verify results', async ({
    page,
  }) => {
    // 1. Navigate to investigations list
    await page.goto('/investigations', { waitUntil: 'networkidle' });
    await expect(page.getByText('Investigations')).toBeVisible({ timeout: 10_000 });

    // 2. Create a new investigation
    const createBtn = page.locator('[data-testid="create-investigation-button"]');
    await expect(createBtn).toBeVisible({ timeout: 5_000 });
    await createBtn.click();

    const testSuffix = Date.now().toString(36);
    const investigationTitle = `E2E Golden Path ${testSuffix}`;

    await page.fill('[data-testid="investigation-title"]', investigationTitle);
    await page.fill(
      '[data-testid="investigation-description"]',
      'Automated golden-path test for production readiness validation',
    );
    await page.click('[data-testid="create-investigation-submit"]');

    // Verify creation succeeded
    await expect(
      page.locator('[data-testid="investigation-created"]'),
    ).toBeVisible({ timeout: 15_000 });

    // 3. Add first entity
    await page.click('[data-testid="add-entity-button"]');
    await page.fill('[data-testid="entity-label"]', 'John Doe');
    await page.selectOption('[data-testid="entity-type"]', 'person');
    await page.fill(
      '[data-testid="entity-description"]',
      'Primary subject of investigation',
    );
    await page.click('[data-testid="entity-save"]');

    // 4. Add second entity
    await page.click('[data-testid="add-entity-button"]');
    await page.fill('[data-testid="entity-label"]', 'Acme Corp');
    await page.selectOption('[data-testid="entity-type"]', 'organization');
    await page.fill(
      '[data-testid="entity-description"]',
      'Organization of interest',
    );
    await page.click('[data-testid="entity-save"]');

    // Verify both entities are visible
    await expect(
      page.locator('[data-testid="entity-john-doe"]'),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('[data-testid="entity-acme-corp"]'),
    ).toBeVisible({ timeout: 5_000 });

    // 5. Create relationship between entities
    await page.click('[data-testid="add-relationship-button"]');
    await page.selectOption('[data-testid="relationship-from"]', 'John Doe');
    await page.selectOption('[data-testid="relationship-to"]', 'Acme Corp');
    await page.selectOption(
      '[data-testid="relationship-type"]',
      'employed_by',
    );
    await page.fill(
      '[data-testid="relationship-description"]',
      'Employment relationship',
    );
    await page.click('[data-testid="relationship-save"]');

    // Verify relationship appears
    await expect(
      page.locator('[data-testid="relationship-john-doe-acme-corp"]'),
    ).toBeVisible({ timeout: 5_000 });

    // 6. Verify consolidated results view
    // Switch to graph tab if available
    const graphTab = page.locator('button:has-text("Graph")');
    if (await graphTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await graphTab.click();
      // Canvas should render the graph
      await expect(page.locator('canvas')).toBeVisible({ timeout: 5_000 });
    }

    // Verify investigation title is still visible in the view
    await expect(page.getByText(investigationTitle)).toBeVisible();
  });

  test('investigation list loads without errors', async ({ page }) => {
    await page.goto('/investigations', { waitUntil: 'networkidle' });
    await expect(page.getByText('Investigations')).toBeVisible({ timeout: 10_000 });

    // Verify no error states
    const errorBanner = page.locator('[data-testid="error-banner"]');
    await expect(errorBanner).not.toBeVisible();
  });

  test('investigation detail page renders for known ID', async ({ page }) => {
    await page.goto('/investigations/inv-1', { waitUntil: 'networkidle' });

    // Should display investigation detail, not a 404
    await expect(page.getByText('Investigation')).toBeVisible({ timeout: 10_000 });

    // Export button should be present (gated by feature.investigation.export in prod)
    await expect(page.getByText('Export Report')).toBeVisible();
  });
});
