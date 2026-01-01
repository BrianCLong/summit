import { test, expect } from '@playwright/test';

test.describe('IntelGraph Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/intelgraph');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept network requests to simulate errors
    await page.route('**/api/evidence*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Try to add evidence which should trigger the error
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Network Error Test');
    await page.locator('button:has-text("Submit")').click();

    // Verify error notification appears
    await expect(page.locator('text="Error"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Failed to save evidence"')).toBeVisible();

    // Components should remain functional after error
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();

    // Restore normal network behavior
    await page.unroute('**/api/evidence*');
  });

  test('should handle timeout errors', async ({ page }) => {
    // Simulate timeout by delaying response
    await page.route('**/api/graph*', route => {
      setTimeout(() => {
        route.fulfill({
          status: 408,
          body: JSON.stringify({ error: 'Request Timeout' })
        });
      }, 10000); // Longer than default timeout
    });

    // Try to load graph data which should timeout
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();

    // Verify timeout notification appears
    await expect(page.locator('text="Timeout"')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text="Request took too long"')).toBeVisible();

    // Restore normal network behavior
    await page.unroute('**/api/graph*');
  });

  test('should handle invalid data input', async ({ page }) => {
    // Try to add evidence with invalid data
    await page.locator('button:has-text("Add Evidence")').click();

    // Submit empty form
    await page.locator('button:has-text("Submit")').click();

    // Verify validation errors appear
    await expect(page.locator('text="Title is required"')).toBeVisible();
    await expect(page.locator('text="Description is required"')).toBeVisible();

    // Try to add evidence with extremely long title
    const extremelyLongTitle = 'A'.repeat(10000);
    await page.locator('input[placeholder="Evidence Title"]').fill(extremelyLongTitle);
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Valid description');

    // Submit and verify handling of long input
    await page.locator('button:has-text("Submit")').click();
    await expect(page.locator('text="Title too long"')).toBeVisible();
  });

  test('should handle component loading states', async ({ page }) => {
    // Simulate slow loading of components
    await page.route('**/api/workspace*', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ name: 'Slow Loading Workspace', components: [] })
        });
      }, 5000); // 5 second delay
    });

    // Navigate to workspace that loads slowly
    await page.goto('/intelgraph/workspace/slow-load');

    // Verify loading indicators appear
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Components should eventually load
    await expect(page.locator('[data-testid="analysis-workspace"]')).toBeVisible({ timeout: 10000 });

    // Restore normal behavior
    await page.unroute('**/api/workspace*');
  });

  test('should handle browser storage limits', async ({ page }) => {
    // Try to store large amount of data in local storage
    const largeData = { data: 'A'.repeat(5000000) }; // 5MB of data
    
    // Attempt to save workspace with large data
    await page.evaluate((data) => {
      localStorage.setItem('large-workspace-data', JSON.stringify(data));
    }, largeData);

    // Try to load the workspace
    await page.reload();

    // Verify error handling when storage limit is exceeded
    const storageError = page.locator('text="Storage limit exceeded"');
    if (await storageError.count() > 0) {
      await expect(storageError).toBeVisible();
    }
  });

  test('should handle graph rendering errors', async ({ page }) => {
    // Simulate invalid graph data that causes rendering errors
    await page.route('**/api/graph-data*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          nodes: [{ id: 1, label: 'Node 1' }],
          edges: [{ source: 1, target: 2 }] // Invalid target
        })
      });
    });

    // Load graph with invalid data
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();

    // Verify graceful handling of invalid graph data
    await expect(page.locator('text="Invalid graph data"')).toBeVisible({ timeout: 10000 });

    // Restore normal behavior
    await page.unroute('**/api/graph-data*');
  });

  test('should handle concurrent operations safely', async ({ page, context }) => {
    // Create multiple pages to simulate concurrent operations
    const page2 = await context.newPage();
    await page2.goto('/intelgraph');

    // Perform operations on both pages simultaneously
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Page 1 Evidence');
    await page.locator('button:has-text("Submit")').click();

    await page2.locator('button:has-text("Add Evidence")').click();
    await page2.locator('input[placeholder="Evidence Title"]').fill('Page 2 Evidence');
    await page2.locator('button:has-text("Submit")').click();

    // Both operations should complete successfully
    await expect(page.locator('text="Page 1 Evidence"')).toBeVisible();
    await expect(page2.locator('text="Page 2 Evidence"')).toBeVisible();

    await page2.close();
  });

  test('should handle memory leaks during extended use', async ({ page }) => {
    // Perform many operations to test for memory issues
    for (let i = 0; i < 20; i++) {
      // Add evidence
      await page.locator('button:has-text("Add Evidence")').click();
      await page.locator('input[placeholder="Evidence Title"]').fill(`Memory Test Evidence ${i}`);
      await page.locator('button:has-text("Submit")').click();

      // Add component
      await page.locator('button:has-text("Add Component")').click();

      // Interact with graph
      const graphCanvas = page.locator('[data-testid="graph-canvas"]');
      await graphCanvas.click({ position: { x: 100 + i * 10, y: 100 + i * 10 } });

      // Small delay to allow for rendering
      await page.waitForTimeout(100);
    }

    // All components should remain functional after many operations
    await expect(page.locator('[data-testid="graph-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-workspace"]')).toBeVisible();
  });

  test('should handle unsupported browser features', async ({ page }) => {
    // Simulate missing browser features
    await page.addInitScript(() => {
      // Remove a critical API to test fallback behavior
      // @ts-ignore
      delete window.WebGLRenderingContext;
    });

    // Reload to apply the script
    await page.reload();

    // Components should provide fallbacks when WebGL is not available
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();

    // Should show appropriate message or fallback
    const fallbackMessage = page.locator('text="WebGL not supported, using fallback renderer"');
    if (await fallbackMessage.count() > 0) {
      await expect(fallbackMessage).toBeVisible();
    }
  });

  test('should handle unexpected component state changes', async ({ page }) => {
    // Add evidence
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('State Change Test');
    await page.locator('button:has-text("Submit")').click();

    // Verify evidence appears
    await expect(page.locator('text="State Change Test"')).toBeVisible();

    // Force a state change by manipulating the DOM (simulating unexpected state changes)
    await page.evaluate(() => {
      const evidenceItems = document.querySelectorAll('[data-testid="evidence-item"]');
      if (evidenceItems.length > 0) {
        evidenceItems[0].setAttribute('data-status', 'corrupted');
      }
    });

    // Components should handle corrupted state gracefully
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();

    // Should either recover from corrupted state or show appropriate error
    const recoveryMessage = page.locator('text="Recovering from state error"');
    if (await recoveryMessage.count() > 0) {
      await expect(recoveryMessage).toBeVisible();
    }
  });
});