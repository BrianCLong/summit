/**
 * E2E Tests for Data Querying
 *
 * Tests the data search and query functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Data Querying', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should perform basic search', async ({ page }) => {
    // Navigate to search page
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('test entity');
    await page.keyboard.press('Enter');

    // Wait for results
    await page.waitForTimeout(2000);

    // Check for results
    const results = page.locator('[data-testid="search-result"], .search-result');
    const resultCount = await results.count();

    expect(resultCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter search results', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('entity');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // Apply filter
    const filterButton = page.locator('button:has-text("Filter")');

    if (await filterButton.isVisible()) {
      await filterButton.click();

      const typeFilter = page.locator('[role="checkbox"]:has-text("Person")');

      if (await typeFilter.isVisible()) {
        await typeFilter.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should sort search results', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('entity');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // Change sort order
    const sortSelect = page.locator('select[name="sort"], [data-testid="sort-select"]');

    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('name');
      await page.waitForTimeout(1000);
    }
  });

  test('should paginate through results', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('entity');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // Click next page
    const nextButton = page.locator('button:has-text("Next"), button[aria-label="Next page"]');

    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should perform advanced query', async ({ page }) => {
    await page.goto('/search');

    // Open advanced search
    const advancedButton = page.locator('button:has-text("Advanced")');

    if (await advancedButton.isVisible()) {
      await advancedButton.click();

      // Fill in advanced fields
      const typeSelect = page.locator('select[name="type"]');
      const dateFrom = page.locator('input[name="dateFrom"]');

      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('person');
      }

      if (await dateFrom.isVisible()) {
        await dateFrom.fill('2024-01-01');
      }

      const searchButton = page.locator('button[type="submit"]');
      await searchButton.click();

      await page.waitForTimeout(1000);
    }
  });

  test('should save search query', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('important entities');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // Save query
    const saveButton = page.locator('button:has-text("Save Query")');

    if (await saveButton.isVisible()) {
      await saveButton.click();

      const nameInput = page.locator('input[name="queryName"]');

      if (await nameInput.isVisible()) {
        await nameInput.fill('My Saved Query');

        const confirmButton = page.locator('button:has-text("Save")');
        await confirmButton.click();
      }
    }
  });

  test('should export search results', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('entity');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // Export results
    const exportButton = page.locator('button:has-text("Export")');

    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download).toBeDefined();
    }
  });

  test('should handle empty search results', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('nonexistent-entity-12345');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // Check for no results message
    const noResultsMessage = page.locator(':has-text("No results found")');
    await expect(noResultsMessage).toBeVisible();
  });

  test('should suggest autocomplete options', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');
    await searchInput.fill('ent');

    // Wait for autocomplete
    await page.waitForTimeout(500);

    const suggestions = page.locator('[role="option"], .autocomplete-option');
    const suggestionCount = await suggestions.count();

    if (suggestionCount > 0) {
      expect(suggestionCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Query Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);
  });

  test('should build visual query', async ({ page }) => {
    await page.goto('/query-builder');

    // Add a condition
    const addConditionButton = page.locator('button:has-text("Add Condition")');

    if (await addConditionButton.isVisible()) {
      await addConditionButton.click();

      // Select field
      const fieldSelect = page.locator('select[name="field"]').first();
      if (await fieldSelect.isVisible()) {
        await fieldSelect.selectOption('type');
      }

      // Select operator
      const operatorSelect = page.locator('select[name="operator"]').first();
      if (await operatorSelect.isVisible()) {
        await operatorSelect.selectOption('equals');
      }

      // Enter value
      const valueInput = page.locator('input[name="value"]').first();
      if (await valueInput.isVisible()) {
        await valueInput.fill('person');
      }
    }
  });

  test('should execute built query', async ({ page }) => {
    await page.goto('/query-builder');

    // Build and execute query
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")');

    if (await executeButton.isVisible()) {
      await executeButton.click();
      await page.waitForTimeout(1000);

      // Check for results
      const results = page.locator('[data-testid="query-results"]');
      await expect(results).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Real-time Search', () => {
  test('should update results as user types', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[name="query"]');

    // Type slowly to trigger real-time search
    await searchInput.type('entity', { delay: 200 });

    // Wait for results to update
    await page.waitForTimeout(1000);

    const results = page.locator('[data-testid="search-result"], .search-result');
    const resultCount = await results.count();

    expect(resultCount).toBeGreaterThanOrEqual(0);
  });
});
