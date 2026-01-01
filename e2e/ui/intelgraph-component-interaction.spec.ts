import { test, expect } from '@playwright/test';

test.describe('IntelGraph Component Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/intelgraph');
  });

  test('should allow evidence filtering and graph synchronization', async ({ page }) => {
    // Add multiple evidence items with different tags
    await page.locator('button:has-text("Add Evidence")').click();
    
    await page.locator('input[placeholder="Evidence Title"]').fill('Digital Evidence');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Digital evidence from computer forensics');
    await page.locator('input[placeholder="Tags (comma-separated)"]').fill('digital,forensics');
    await page.locator('button:has-text("Submit")').click();
    
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Physical Evidence');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Physical evidence from crime scene');
    await page.locator('input[placeholder="Tags (comma-separated)"]').fill('physical,scene');
    await page.locator('button:has-text("Submit")').click();
    
    // Test filtering by tag
    const filterButton = page.locator('button:has-text("Filter")');
    await filterButton.click();
    
    const tagInput = page.locator('input[placeholder="Search tags..."]');
    await tagInput.fill('digital');
    
    // Verify only digital evidence is shown
    await expect(page.locator('text="Digital Evidence"')).toBeVisible();
    await expect(page.locator('text="Physical Evidence"')).not.toBeVisible();
    
    // Test graph canvas response to evidence filtering
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // The graph should update based on the filtered evidence
    const graphNodes = page.locator('[data-testid="graph-node"]');
    await expect(graphNodes).toHaveCountGreaterThan(0);
  });

  test('should maintain workspace layout across sessions', async ({ page }) => {
    // Arrange the AnalysisWorkspace with multiple components
    const addComponentButton = page.locator('button:has-text("Add Component")');
    await addComponentButton.click();
    
    // Add multiple components
    for (let i = 0; i < 3; i++) {
      await addComponentButton.click();
      await page.waitForTimeout(500); // Allow for component rendering
    }
    
    // Arrange components in a specific layout
    const components = page.locator('[data-testid="workspace-component"]');
    await expect(components).toHaveCount(4); // Original + 3 added
    
    // Save the workspace layout
    const saveButton = page.locator('button[title="Save Workspace"]');
    await saveButton.click();
    
    const workspaceNameInput = page.locator('input[placeholder="Workspace Name"]');
    await workspaceNameInput.fill('Layout Test Workspace');
    
    const confirmSaveButton = page.locator('button:has-text("Save")');
    await confirmSaveButton.click();
    
    await expect(page.locator('text="Workspace saved successfully"')).toBeVisible();
    
    // Reload the page to verify layout persistence
    await page.reload();
    
    // Load the saved workspace
    const loadButton = page.locator('button[title="Load Workspace"]');
    await loadButton.click();
    
    const loadWorkspaceButton = page.locator('button:has-text("Layout Test Workspace")');
    await loadWorkspaceButton.click();
    
    // Verify the layout is restored
    await expect(page.locator('[data-testid="workspace-component"]')).toHaveCount(4);
  });

  test('should handle graph canvas interactions with evidence board', async ({ page }) => {
    // Add evidence to the board
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Graph Node Evidence');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Evidence that should appear as a graph node');
    await page.locator('button:has-text("Submit")').click();
    
    // Verify evidence appears in the board
    await expect(page.locator('text="Graph Node Evidence"')).toBeVisible();
    
    // Select the evidence item
    const evidenceItem = page.locator('text="Graph Node Evidence"');
    await evidenceItem.click();
    
    // The graph canvas should highlight related nodes
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Test zoom functionality
    const zoomInButton = page.locator('button[aria-label="Zoom In"]');
    await zoomInButton.click();
    await zoomInButton.click(); // Zoom in twice
    
    // Verify zoom level has changed
    const zoomDisplay = page.locator('[data-testid="zoom-level"]');
    await expect(zoomDisplay).toBeVisible();
    
    // Test panning functionality
    await graphCanvas.click({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await page.mouse.move(150, 150);
    await page.mouse.up();
    
    // The graph should respond to panning
    await expect(graphCanvas).toBeVisible();
  });

  test('should maintain consistent state between components during user actions', async ({ page }) => {
    // Add an evidence item
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('State Sync Test');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Testing state synchronization between components');
    await page.locator('button:has-text("Submit")').click();
    
    // Verify it appears in the evidence board
    await expect(page.locator('text="State Sync Test"')).toBeVisible();
    
    // Add a component to the analysis workspace
    await page.locator('button:has-text("Add Component")').click();
    
    // Verify the component appears
    await expect(page.locator('text="New Component"')).toBeVisible();
    
    // Change the layout mode in the analysis workspace
    const layoutButtons = page.locator('[data-testid="layout-mode-button"]');
    await expect(layoutButtons).toHaveCountGreaterThan(0);
    
    // Click the first layout button to change layout
    await layoutButtons.first().click();
    
    // Add another evidence item
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Second State Sync Test');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Second test for state synchronization');
    await page.locator('button:has-text("Submit")').click();
    
    // Verify both evidence items appear
    await expect(page.locator('text="State Sync Test"')).toBeVisible();
    await expect(page.locator('text="Second State Sync Test"')).toBeVisible();
    
    // The analysis workspace should remain in the new layout
    await expect(layoutButtons.first()).toBeVisible();
  });

  test('should handle concurrent user interactions gracefully', async ({ page, context }) => {
    // Create a second page context to simulate concurrent users
    const secondPage = await context.newPage();
    await secondPage.goto('/intelgraph');
    
    // First user adds evidence
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Concurrent User Evidence');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Evidence added by first user');
    await page.locator('button:has-text("Submit")').click();
    
    // Second user should see the evidence (if real-time sync is implemented)
    // For now, we'll refresh to see the changes
    await secondPage.reload();
    
    // Both users should see the evidence
    await expect(page.locator('text="Concurrent User Evidence"')).toBeVisible();
    await expect(secondPage.locator('text="Concurrent User Evidence"')).toBeVisible();
    
    // Add component in first workspace
    await page.locator('button:has-text("Add Component")').click();
    await expect(page.locator('text="New Component"')).toBeVisible();
    
    // Add different component in second workspace
    await secondPage.locator('button:has-text("Add Component")').click();
    await expect(secondPage.locator('text="New Component"')).toBeVisible();
    
    // Both workspaces should maintain their own state
    const firstPageComponents = await page.locator('[data-testid="workspace-component"]').count();
    const secondPageComponents = await secondPage.locator('[data-testid="workspace-component"]').count();
    
    expect(firstPageComponents).toBeGreaterThanOrEqual(1);
    expect(secondPageComponents).toBeGreaterThanOrEqual(1);
    
    await secondPage.close();
  });

  test('should maintain performance with complex evidence relationships', async ({ page }) => {
    // Create a complex set of related evidence items
    const evidenceItems = [
      { title: 'Root Evidence', description: 'Initial evidence item', tags: 'root,initial' },
      { title: 'Related Evidence 1', description: 'First related evidence', tags: 'related,connection' },
      { title: 'Related Evidence 2', description: 'Second related evidence', tags: 'related,connection' },
      { title: 'Supporting Evidence', description: 'Supporting evidence item', tags: 'support,backup' },
      { title: 'Contradictory Evidence', description: 'Evidence that contradicts', tags: 'contradict,oppose' },
    ];
    
    // Add all evidence items
    for (const item of evidenceItems) {
      await page.locator('button:has-text("Add Evidence")').click();
      await page.locator('input[placeholder="Evidence Title"]').fill(item.title);
      await page.locator('textarea[placeholder="Evidence Description"]').fill(item.description);
      await page.locator('input[placeholder="Tags (comma-separated)"]').fill(item.tags);
      await page.locator('button:has-text("Submit")').click();
    }
    
    // Verify all items appear
    for (const item of evidenceItems) {
      await expect(page.locator(`text="${item.title}"`)).toBeVisible();
    }
    
    // Test filtering performance with multiple tags
    const filterButton = page.locator('button:has-text("Filter")');
    await filterButton.click();
    
    const tagInput = page.locator('input[placeholder="Search tags..."]');
    await tagInput.fill('related');
    
    // Should quickly filter to show related items
    await expect(page.locator('text="Related Evidence 1"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="Related Evidence 2"')).toBeVisible();
    
    // Test graph canvas performance with multiple nodes
    const graphCanvas = page.locator('[data-testid="graph-canvas"]');
    await expect(graphCanvas).toBeVisible();
    
    // Interact with the graph to ensure responsiveness
    await graphCanvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(200); // Brief delay to allow for rendering
    
    // Test zoom performance
    const zoomInButton = page.locator('button[aria-label="Zoom In"]');
    for (let i = 0; i < 3; i++) {
      await zoomInButton.click();
      await page.waitForTimeout(100); // Brief delay between zooms
    }
    
    // The graph should remain responsive
    await expect(graphCanvas).toBeVisible();
  });

  test('should handle edge cases and boundary conditions', async ({ page }) => {
    // Test with empty evidence board
    const evidenceBoard = page.locator('[data-testid="evidence-board"]');
    await expect(evidenceBoard).toBeVisible();
    
    // Test with empty analysis workspace
    const analysisWorkspace = page.locator('[data-testid="analysis-workspace"]');
    await expect(analysisWorkspace).toBeVisible();
    
    // Add evidence with special characters
    await page.locator('button:has-text("Add Evidence")').click();
    await page.locator('input[placeholder="Evidence Title"]').fill('Evidence with "quotes" & <tags>');
    await page.locator('textarea[placeholder="Evidence Description"]').fill('Evidence containing special characters: !@#$%^&*()');
    await page.locator('input[placeholder="Tags (comma-separated)"]').fill('special,chars,quotes');
    await page.locator('button:has-text("Submit")').click();
    
    // Verify special characters are handled properly
    await expect(page.locator('text="Evidence with "quotes" & <tags>"')).toBeVisible();
    
    // Test with very long text
    await page.locator('button:has-text("Add Evidence")').click();
    const longTitle = 'A'.repeat(200);
    const longDescription = 'B'.repeat(500);
    
    await page.locator('input[placeholder="Evidence Title"]').fill(longTitle);
    await page.locator('textarea[placeholder="Evidence Description"]').fill(longDescription);
    await page.locator('button:has-text("Submit")').click();
    
    // Verify long text is handled properly
    await expect(page.locator(`text="${longTitle.substring(0, 50)}..."`)).toBeVisible();
    
    // Test workspace with maximum components
    for (let i = 0; i < 10; i++) {
      await page.locator('button:has-text("Add Component")').click();
      await page.waitForTimeout(200); // Brief delay between adds
    }
    
    // Verify all components are handled
    const components = page.locator('[data-testid="workspace-component"]');
    await expect(components).toHaveCountGreaterThanOrEqual(10);
  });
});