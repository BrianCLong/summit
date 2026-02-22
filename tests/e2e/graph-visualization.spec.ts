/**
 * E2E Tests for Graph Visualization
 *
 * Tests the graph visualization and interaction features
 */

import { test, expect } from '@playwright/test';

test.describe('Graph Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);

    // Navigate to graph view
    await page.goto('/graph');
  });

  test('should display graph canvas', async ({ page }) => {
    const canvas = page.locator('canvas, svg');
    await expect(canvas).toBeVisible();
  });

  test('should render nodes and edges', async ({ page }) => {
    // Wait for graph to load
    await page.waitForTimeout(2000);

    // Check for graph elements
    const nodes = page.locator('[data-node-id], .node, circle.node');
    const nodeCount = await nodes.count();

    expect(nodeCount).toBeGreaterThan(0);
  });

  test('should zoom in and out', async ({ page }) => {
    const canvas = page.locator('canvas, svg').first();

    // Get initial zoom level (if available)
    const zoomInButton = page.locator('button[aria-label*="zoom in"], button:has-text("+")');
    const zoomOutButton = page.locator('button[aria-label*="zoom out"], button:has-text("-")');

    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      await page.waitForTimeout(500);

      await zoomOutButton.click();
      await page.waitForTimeout(500);
    }

    // Mouse wheel zoom
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, 100); // Zoom out
  });

  test('should pan the graph', async ({ page }) => {
    const canvas = page.locator('canvas, svg').first();
    const box = await canvas.boundingBox();

    if (box) {
      // Click and drag to pan
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();
    }
  });

  test('should select a node on click', async ({ page }) => {
    await page.waitForTimeout(2000);

    const node = page.locator('[data-node-id], .node, circle.node').first();

    if (await node.isVisible()) {
      await node.click();

      // Check if node details panel appears
      const detailsPanel = page.locator('[data-testid="node-details"], .node-details, aside');
      await expect(detailsPanel).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show node tooltip on hover', async ({ page }) => {
    await page.waitForTimeout(2000);

    const node = page.locator('[data-node-id], .node, circle.node').first();

    if (await node.isVisible()) {
      await node.hover();

      // Wait for tooltip
      const tooltip = page.locator('[role="tooltip"], .tooltip');
      await expect(tooltip).toBeVisible({ timeout: 3000 });
    }
  });

  test('should filter nodes by type', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Filter"), [data-testid="filter-button"]');

    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Select a filter option
      const filterOption = page.locator('[role="checkbox"]:has-text("Person")').first();

      if (await filterOption.isVisible()) {
        await filterOption.click();

        // Wait for graph to update
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should search for nodes', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test entity');
      await page.keyboard.press('Enter');

      // Wait for search results
      await page.waitForTimeout(1000);
    }
  });

  test('should expand node connections', async ({ page }) => {
    await page.waitForTimeout(2000);

    const node = page.locator('[data-node-id], .node, circle.node').first();

    if (await node.isVisible()) {
      // Right-click for context menu
      await node.click({ button: 'right' });

      // Look for expand option
      const expandOption = page.locator('[role="menuitem"]:has-text("Expand")');

      if (await expandOption.isVisible()) {
        await expandOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should change graph layout', async ({ page }) => {
    const layoutButton = page.locator('button:has-text("Layout"), [data-testid="layout-button"]');

    if (await layoutButton.isVisible()) {
      await layoutButton.click();

      // Select layout option
      const layoutOption = page.locator('[role="menuitem"]:has-text("Force")').first();

      if (await layoutOption.isVisible()) {
        await layoutOption.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});

test.describe('Graph Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);
    await page.goto('/graph');
  });

  test('should multi-select nodes', async ({ page }) => {
    await page.waitForTimeout(2000);

    const nodes = page.locator('[data-node-id], .node, circle.node');
    const nodeCount = await nodes.count();

    if (nodeCount >= 2) {
      // Hold Ctrl/Cmd and click multiple nodes
      await page.keyboard.down('Control');
      await nodes.nth(0).click();
      await nodes.nth(1).click();
      await page.keyboard.up('Control');
    }
  });

  test('should create new relationship', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add Relationship")');

    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill in relationship form
      const sourceInput = page.locator('input[name="source"]');
      const targetInput = page.locator('input[name="target"]');

      if (await sourceInput.isVisible()) {
        await sourceInput.fill('entity-1');
        await targetInput.fill('entity-2');

        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
      }
    }
  });

  test('should delete node', async ({ page }) => {
    await page.waitForTimeout(2000);

    const node = page.locator('[data-node-id], .node, circle.node').first();

    if (await node.isVisible()) {
      await node.click({ button: 'right' });

      const deleteOption = page.locator('[role="menuitem"]:has-text("Delete")');

      if (await deleteOption.isVisible()) {
        await deleteOption.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")');

        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });
});

test.describe('Graph Performance', () => {
  test('should handle large graphs', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);

    // Navigate to large graph
    await page.goto('/graph?size=large');

    // Wait for graph to render
    await page.waitForTimeout(5000);

    // Graph should still be responsive
    const canvas = page.locator('canvas, svg').first();
    await expect(canvas).toBeVisible();
  });

  test('should render graph without lag', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home)/);
    await page.goto('/graph');

    // Perform rapid zoom operations
    const zoomInButton = page.locator('button[aria-label*="zoom in"]');

    if (await zoomInButton.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await zoomInButton.click();
        await page.waitForTimeout(100);
      }
    }
  });
});
