import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('IntelGraph Accessibility and Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/intelgraph');
  });

  test('should pass accessibility tests on desktop', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility tests on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/intelgraph');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility tests on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/intelgraph');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should maintain responsive layout across screen sizes', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/intelgraph');
    
    const desktopLayout = page.locator('.intelgraph-layout');
    await expect(desktopLayout).toBeVisible();
    
    // Verify all components are properly positioned
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    const analysisWorkspace = page.locator('[data-testid="analysis-workspace"]');
    
    await expect(graphCanvas).toBeVisible();
    await expect(evidenceBoard).toBeVisible();
    await expect(analysisWorkspace).toBeVisible();
    
    // Test tablet layout
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    
    // Components should adapt to tablet layout
    await expect(graphCanvas).toBeVisible();
    await expect(evidenceBoard).toBeVisible();
    await expect(analysisWorkspace).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // On mobile, components might be in a tabbed or collapsible layout
    const mobileLayout = page.locator('.mobile-layout, .collapsible-layout');
    if (await mobileLayout.count() > 0) {
      await expect(mobileLayout).toBeVisible();
    } else {
      // If no specific mobile layout, ensure components are still accessible
      await expect(graphCanvas).toBeVisible();
      await expect(evidenceBoard).toBeVisible();
      await expect(analysisWorkspace).toBeVisible();
    }
  });

  test('should support keyboard navigation throughout the application', async ({ page }) => {
    // Test keyboard navigation from the beginning
    await page.keyboard.press('Tab');
    const firstFocusable = page.locator(':focus');
    await expect(firstFocusable).toBeVisible();
    
    // Navigate through the main components using keyboard
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Brief pause to allow for focus changes
    }
    
    // Test keyboard shortcuts
    await page.keyboard.press('Control+K'); // Command palette
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
    
    await page.keyboard.press('Escape'); // Close command palette
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
    
    // Test evidence board keyboard shortcuts
    await page.keyboard.press('KeyE'); // Focus on evidence board
    await expect(page.locator('[data-testid="evidence-board"]')).toBeFocused();
    
    // Test graph canvas keyboard interactions
    await page.keyboard.press('KeyG'); // Focus on graph canvas
    await expect(page.locator('[data-testid="graph-canvas"]')).toBeFocused();
    
    // Test zoom shortcuts
    await page.keyboard.press('Control+Plus'); // Zoom in
    await page.keyboard.press('Control+Minus'); // Zoom out
    
    // Test analysis workspace keyboard interactions
    await page.keyboard.press('KeyA'); // Focus on analysis workspace
    await expect(page.locator('[data-testid="analysis-workspace"]')).toBeFocused();
  });

  test('should maintain focus management during component interactions', async ({ page }) => {
    // Add evidence and ensure focus management
    const addEvidenceButton = page.locator('button:has-text("Add Evidence")');
    await addEvidenceButton.click();
    
    // Focus should move to the evidence form
    const titleInput = page.locator('input[placeholder="Evidence Title"]');
    await expect(titleInput).toBeFocused();
    
    // Fill the form
    await titleInput.fill('Focus Management Test');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Testing focus management');
    
    // Submit and focus should return appropriately
    await page.locator('button:has-text("Submit")').click();
    
    // Focus should return to a logical place after submission
    await expect(page.locator('text="Focus Management Test"')).toBeVisible();
    
    // Test focus in analysis workspace
    const addComponentButton = page.locator('button:has-text("Add Component")');
    await addComponentButton.click();
    
    // Focus should move to the new component
    const newComponent = page.locator('text="New Component"');
    await expect(newComponent).toBeVisible();
  });

  test('should provide proper screen reader support', async ({ page }) => {
    // Test ARIA labels and descriptions
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toHaveAttribute('aria-label', 'Evidence Board');
    await expect(evidenceBoard).toHaveAttribute('role', 'region');
    
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toHaveAttribute('aria-label', 'Graph Visualization Canvas');
    await expect(graphCanvas).toHaveAttribute('role', 'img');
    
    const analysisWorkspace = page.locator('[data-testid="analysis-workspace"]');
    await expect(analysisWorkspace).toHaveAttribute('aria-label', 'Analysis Workspace');
    await expect(analysisWorkspace).toHaveAttribute('role', 'main');
    
    // Test dynamic ARIA updates
    await page.locator('button:has-text("Add Evidence")').click();
    await expect(page.locator('[data-testid="evidence-form"]')).toHaveAttribute('aria-live', 'polite');
    
    // Test landmark regions
    const mainRegion = page.locator('main');
    await expect(mainRegion).toBeVisible();
    
    const navigationRegion = page.locator('nav');
    if (await navigationRegion.count() > 0) {
      await expect(navigationRegion).toHaveAttribute('aria-label', 'Main Navigation');
    }
  });

  test('should maintain accessibility during responsive transitions', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/intelgraph');
    
    // Add an evidence item
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Responsive Test Evidence');
    await page.locator('button:has-text("Submit")').click();
    
    // Change to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Verify accessibility is maintained
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Ensure the evidence item is still accessible
    await expect(page.locator('text="Responsive Test Evidence"')).toBeVisible();
  });

  test('should handle touch interactions on mobile devices', async ({ page }) => {
    // Set mobile viewport and user agent
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/intelgraph');
    
    // Test touch interactions with evidence board
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toBeVisible();
    
    // Simulate touch events
    await evidenceBoard.tap();
    await page.waitForTimeout(500);
    
    // Test swipe gestures if implemented
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Simulate a swipe on the graph canvas
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(100);
    await page.touchscreen.tap(150, 150);
    
    // Test pinch gesture simulation for zoom (if supported)
    // This is more complex to simulate in Playwright, so we'll test zoom buttons instead
    const zoomInButton = page.locator('button[aria-label="Zoom In"]');
    if (await zoomInButton.count() > 0) {
      await zoomInButton.tap();
      await expect(zoomInButton).toBeVisible();
    }
    
    // Test touch-friendly controls
    const mobileMenuButton = page.locator('button[aria-label="Menu"]');
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.tap();
      await expect(page.locator('.mobile-menu')).toBeVisible();
    }
  });

  test('should maintain high contrast mode compatibility', async ({ page }) => {
    // Test with forced colors (high contrast simulation)
    await page.emulateMedia({ forcedColors: 'active' });
    
    await page.goto('/intelgraph');
    
    // All components should remain visible and usable
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toBeVisible();
    
    const analysisWorkspace = page.locator('[data-testid="analysis-workspace"]');
    await expect(analysisWorkspace).toBeVisible();
    
    // Buttons should remain distinguishable
    const buttons = page.locator('button');
    await expect(buttons).toHaveCountGreaterThan(0);
    
    // Text should remain readable
    const headings = page.locator('h1, h2, h3');
    await expect(headings).toHaveCountGreaterThan(0);
    
    // Reset to normal mode
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/intelgraph');
    
    // Add evidence to test if animations are properly disabled
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Reduced Motion Test');
    await page.locator('button:has-text("Submit")').click();
    
    // The evidence should appear without jarring animations
    await expect(page.locator('text="Reduced Motion Test"')).toBeVisible();
    
    // Test graph canvas with reduced motion
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Interact with the graph to ensure it works without animations
    await graphCanvas.click({ position: { x: 100, y: 100 } });
    
    // Reset to normal motion
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('should maintain accessibility during error states', async ({ page }) => {
    // Simulate an error state
    await page.route('**/api/**', route => {
      if (route.request().url().includes('/api/evidence')) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' })
        });
      } else {
        route.continue();
      }
    });
    
    // Try to add evidence which should trigger an error
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Error State Test');
    await page.locator('button:has-text("Submit")').click();
    
    // Error message should be accessible
    await expect(page.locator('text="Error"')).toBeVisible();
    await expect(page.locator('text="Failed to save evidence"')).toBeVisible();
    
    // Error message should have appropriate ARIA attributes
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    }
    
    // Components should remain accessible even in error state
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toBeVisible();
    
    // Clean up route
    await page.unroute('**/api/**');
  });
});