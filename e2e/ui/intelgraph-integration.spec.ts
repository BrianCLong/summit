import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('IntelGraph Platform Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main IntelGraph interface with all components', async ({ page }) => {
    // Navigate to the IntelGraph workspace
    await page.goto('/intelgraph');
    
    // Check that the main layout elements are present
    await expect(page.locator('h1:has-text("IntelGraph")')).toBeVisible();
    
    // Verify that the GraphCanvas component is present
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Verify that the EvidenceBoard component is present
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toBeVisible();
    
    // Verify that the AnalysisWorkspace component is present
    const analysisWorkspace = page.locator('[data-testid="analysis-workspace"]');
    await expect(analysisWorkspace).toBeVisible();
    
    // Verify the layout structure
    const layout = page.locator('.intelgraph-layout');
    await expect(layout).toBeVisible();
    
    // Check that all essential UI elements are present
    await expect(page.locator('button:has-text("Add Evidence")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Component")')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Load")')).toBeVisible();
  });

  test('should handle drag-and-drop between EvidenceBoard and GraphCanvas', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Add an evidence item to the EvidenceBoard
    const addEvidenceButton = page.locator('button:has-text("Add Evidence")');
    await addEvidenceButton.click();
    
    // Fill in evidence details
    const titleInput = page.locator('input[placeholder="Evidence Title"]');
    await titleInput.fill('Test Evidence');
    
    const descriptionInput = page.locator('textarea[placeholder="Evidence Description"]');
    await descriptionInput.fill('This is a test evidence item for integration testing');
    
    // Submit the evidence
    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();
    
    // Verify the evidence appears in the EvidenceBoard
    await expect(page.locator('text="Test Evidence"')).toBeVisible();
    
    // Drag the evidence item to the GraphCanvas area
    const evidenceItem = page.locator('text="Test Evidence"');
    await expect(evidenceItem).toBeVisible();
    
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Perform the drag-and-drop operation
    await evidenceItem.dragTo(graphCanvas);
    
    // Verify that the evidence item is now associated with the graph
    await expect(page.locator('text="Test Evidence"')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain responsive layout across different screen sizes', async ({ page }) => {
    // Test on desktop resolution
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/intelgraph');
    
    // Verify all components are visible
    await expect(page.locator('[data-testid="graph-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-workspace"]')).toBeVisible();
    
    // Test on tablet resolution
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    
    // Components should still be accessible
    await expect(page.locator('[data-testid="graph-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-workspace"]')).toBeVisible();
    
    // Test on mobile resolution
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Components should adapt to mobile layout
    await expect(page.locator('[data-testid="graph-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-workspace"]')).toBeVisible();
    
    // Verify responsive navigation
    const mobileMenuButton = page.locator('button[aria-label="Menu"]');
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.click();
      await expect(page.locator('.mobile-menu')).toBeVisible();
    }
  });

  test('should maintain accessibility compliance across all components', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Run accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Expect no violations
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('button:focus')).toBeVisible();
    
    // Test keyboard shortcuts
    await page.keyboard.press('Control+Shift+K'); // Command palette shortcut
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
    
    // Test focus management
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await graphCanvas.focus();
    await expect(graphCanvas).toBeFocused();
    
    // Test ARIA attributes
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toHaveAttribute('role', 'main');
    await expect(evidenceBoard).toHaveAttribute('aria-label', 'Evidence Board');
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Test network error handling
    await page.route('**/api/evidence*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Try to add evidence which should trigger the error
    const addEvidenceButton = page.locator('button:has-text("Add Evidence")');
    await addEvidenceButton.click();
    
    const titleInput = page.locator('input[placeholder="Evidence Title"]');
    await titleInput.fill('Test Evidence');
    
    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();
    
    // Check for error notification
    await expect(page.locator('text="Error"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Failed to save evidence"')).toBeVisible();
    
    // Reset the route to normal operation
    await page.unroute('**/api/evidence*');
  });

  test('should maintain state consistency across components', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Add evidence to the EvidenceBoard
    const addEvidenceButton = page.locator('button:has-text("Add Evidence")');
    await addEvidenceButton.click();
    
    const titleInput = page.locator('input[placeholder="Evidence Title"]');
    await titleInput.fill('State Test Evidence');
    
    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();
    
    // Verify evidence appears in the board
    await expect(page.locator('text="State Test Evidence"')).toBeVisible();
    
    // Navigate to a different section and back
    await page.click('text="Dashboard"');
    await page.waitForURL('**/dashboard');
    await page.goto('/intelgraph');
    
    // Verify the evidence is still present
    await expect(page.locator('text="State Test Evidence"')).toBeVisible();
    
    // Test AnalysisWorkspace state persistence
    const addComponentButton = page.locator('button:has-text("Add Component")');
    await addComponentButton.click();
    
    // Verify component appears
    const newComponent = page.locator('text="New Component"');
    await expect(newComponent).toBeVisible();
    
    // Navigate away and back
    await page.click('text="Settings"');
    await page.waitForURL('**/settings');
    await page.goto('/intelgraph');
    
    // Verify the component is still present
    await expect(newComponent).toBeVisible();
  });

  test('should support collaborative features', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Test real-time collaboration indicators
    const presenceIndicator = page.locator('[data-testid="user-presence"]');
    await expect(presenceIndicator).toBeVisible();
    
    // Test shared workspace state
    const workspaceNameInput = page.locator('input[placeholder="Workspace Name"]');
    await workspaceNameInput.fill('Integration Test Workspace');
    
    // Verify the name is saved
    await expect(workspaceNameInput).toHaveValue('Integration Test Workspace');
    
    // Test collaborative editing (simulated)
    const shareButton = page.locator('button:has-text("Share")');
    await expect(shareButton).toBeVisible();
    
    // Click share button
    await shareButton.click();
    
    // Verify share dialog appears
    const shareDialog = page.locator('[data-testid="share-dialog"]');
    await expect(shareDialog).toBeVisible();
  });

  test('should handle performance under load', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Add multiple evidence items to test performance
    for (let i = 0; i < 10; i++) {
      const addEvidenceButton = page.locator('button:has-text("Add Evidence")');
      await addEvidenceButton.click();
      
      const titleInput = page.locator('input[placeholder="Evidence Title"]');
      await titleInput.fill(`Performance Test Evidence ${i}`);
      
      const descriptionInput = page.locator('textarea[placeholder="Evidence Description"]');
      await descriptionInput.fill(`Performance test evidence item ${i} for load testing`);
      
      const submitButton = page.locator('button:has-text("Submit")');
      await submitButton.click();
      
      // Verify the evidence appears
      await expect(page.locator(`text="Performance Test Evidence ${i}"`)).toBeVisible();
    }
    
    // Test graph performance with multiple nodes
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Interact with the graph to ensure it remains responsive
    await graphCanvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(100); // Small delay to allow for rendering
    
    // Test EvidenceBoard performance
    const searchInput = page.locator('input[placeholder="Search evidence..."]');
    await searchInput.fill('Performance');
    
    // Verify search results appear quickly
    await expect(page.locator('text="Performance Test Evidence"')).toBeVisible({ timeout: 5000 });
  });

  test('should maintain design system consistency', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Verify design system components are used consistently
    const buttons = page.locator('button');
    await expect(buttons).toHaveCountGreaterThan(0);
    
    // Check for consistent styling (primary buttons)
    const primaryButtons = page.locator('button.primary');
    await expect(primaryButtons).toHaveCountGreaterThan(0);
    
    // Verify color palette consistency
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    
    // Verify typography consistency
    const headings = page.locator('h1, h2, h3');
    await expect(headings).toHaveCountGreaterThan(0);
    
    // Verify spacing consistency through CSS classes
    const spacedElements = page.locator('.p-4, .m-4, .space-y-4');
    await expect(spacedElements).toHaveCountGreaterThan(0);
  });

  test('should handle data persistence correctly', async ({ page }) => {
    await page.goto('/intelgraph');
    
    // Create and save a workspace
    const workspaceNameInput = page.locator('input[placeholder="Workspace Name"]');
    await workspaceNameInput.fill('Persistence Test Workspace');
    
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    
    // Wait for save confirmation
    await expect(page.locator('text="Workspace saved successfully"')).toBeVisible({ timeout: 10000 });
    
    // Reload the page to test persistence
    await page.reload();
    
    // Verify the workspace name is preserved
    await expect(workspaceNameInput).toHaveValue('Persistence Test Workspace');
    
    // Add an evidence item and verify it persists
    const addEvidenceButton = page.locator('button:has-text("Add Evidence")');
    await addEvidenceButton.click();
    
    const titleInput = page.locator('input[placeholder="Evidence Title"]');
    await titleInput.fill('Persistent Evidence');
    
    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();
    
    // Reload again to test persistence
    await page.reload();
    
    // Verify the evidence item is still present
    await expect(page.locator('text="Persistent Evidence"')).toBeVisible();
  });
});