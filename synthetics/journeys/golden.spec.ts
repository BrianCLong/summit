import { test, expect } from '@playwright/test';

test.describe('Golden Path Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test tenant
    await page.setExtraHTTPHeaders({
      'x-tenant-id': process.env.E2E_TENANT_ID || 'demo-tenant-id'
    });
  });

  test('complete user journey: login → search → detail → export', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('/');
    await expect(page).toHaveTitle(/IntelGraph/);
    
    // 2. Login flow
    await page.click('text=Login');
    await page.fill('#email', process.env.E2E_USER || 'test@example.com');
    await page.fill('#password', process.env.E2E_PASS || 'password');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
    
    // 3. Search functionality  
    await page.fill('#search-input', 'kubernetes deployment');
    await page.press('#search-input', 'Enter');
    
    // Verify search results
    await expect(page.locator('[data-test="result"]')).toHaveCountGreaterThan(0);
    await expect(page.locator('[data-test="search-stats"]')).toBeVisible();
    
    // 4. View details of first result
    await page.click('[data-test="result"]:first-child a');
    await expect(page.locator('[data-test="entity-detail"]')).toBeVisible();
    await expect(page.locator('[data-test="entity-graph"]')).toBeVisible();
    
    // 5. Export functionality
    await page.click('[data-test="export-button"]');
    await page.selectOption('[data-test="export-format"]', 'json');
    
    // Start download and verify
    const downloadPromise = page.waitForDownload();
    await page.click('[data-test="download-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    
    // 6. Verify navigation and state preservation
    await page.goBack();
    await expect(page.locator('[data-test="result"]')).toHaveCountGreaterThan(0);
  });

  test('search with filters and pagination', async ({ page }) => {
    await page.goto('/');
    
    // Login (simplified)
    await page.fill('#email', process.env.E2E_USER || 'test@example.com');
    await page.fill('#password', process.env.E2E_PASS || 'password');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Welcome');
    
    // Advanced search with filters
    await page.fill('#search-input', 'network security');
    await page.click('[data-test="filters-toggle"]');
    await page.check('[data-test="filter-type-entity"]');
    await page.selectOption('[data-test="filter-date"]', '7days');
    await page.click('[data-test="apply-filters"]');
    
    // Verify filtered results
    await expect(page.locator('[data-test="result"]')).toHaveCountGreaterThan(0);
    await expect(page.locator('[data-test="active-filters"]')).toBeVisible();
    
    // Test pagination
    if (await page.locator('[data-test="next-page"]').isVisible()) {
      await page.click('[data-test="next-page"]');
      await expect(page.locator('[data-test="page-indicator"]')).toContainText('2');
    }
  });

  test('collaborative features', async ({ page }) => {
    await page.goto('/');
    
    // Login and navigate to collaboration
    await page.fill('#email', process.env.E2E_USER || 'test@example.com');
    await page.fill('#password', process.env.E2E_PASS || 'password');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Welcome');
    
    // Create a new investigation
    await page.click('[data-test="new-investigation"]');
    await page.fill('[data-test="investigation-title"]', 'E2E Test Investigation');
    await page.fill('[data-test="investigation-description"]', 'Automated test investigation');
    await page.click('[data-test="create-investigation"]');
    
    // Add entities to investigation
    await page.fill('#search-input', 'test entity');
    await page.press('#search-input', 'Enter');
    await page.click('[data-test="result"]:first-child [data-test="add-to-investigation"]');
    
    // Verify entity was added
    await expect(page.locator('[data-test="investigation-entities"]')).toHaveCountGreaterThan(0);
    
    // Share investigation (if available in plan)
    if (await page.locator('[data-test="share-investigation"]').isVisible()) {
      await page.click('[data-test="share-investigation"]');
      await page.fill('[data-test="share-email"]', 'colleague@example.com');
      await page.click('[data-test="send-share"]');
      await expect(page.locator('text=Investigation shared')).toBeVisible();
    }
  });
});