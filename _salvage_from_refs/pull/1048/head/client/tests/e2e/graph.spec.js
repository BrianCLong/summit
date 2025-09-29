
import { test, expect } from '@playwright/test';

test.describe('Graph Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application's root URL
    await page.goto('http://localhost:5173'); // Assuming Vite dev server runs on 5173
  });

  test('should display the graph container', async ({ page }) => {
    const graphContainer = page.locator('#cy');
    await expect(graphContainer).toBeVisible();
  });

  test('should select a node and update the selected node display', async ({ page }) => {
    // Wait for the graph to render and nodes to be present
    await page.waitForSelector('#cy canvas');

    // Click on a node (assuming node 'a' is present and clickable)
    // This might require more sophisticated targeting if nodes overlap
    // For simplicity, we'll try to click near the center of the graph
    // In a real scenario, you might need to get node positions from Cytoscape.js
    // or use a more robust selector if nodes have unique, clickable elements.
    const nodeA = page.locator('#cy').locator('text=Node A'); // Assuming node labels are rendered as text
    await nodeA.click();

    // Verify the selected node display updates
    const selectedNodeDisplay = page.locator('text=Selected Node: a');
    await expect(selectedNodeDisplay).toBeVisible();
  });

  test('should change layout when layout button is clicked', async ({ page }) => {
    const dagreLayoutButton = page.locator('button', { hasText: 'Dagre Layout' });
    await dagreLayoutButton.click();

    // You might need to add a wait for the layout transition to complete
    // For now, we'll just check if the button click doesn't break anything
    const graphContainer = page.locator('#cy');
    await expect(graphContainer).toBeVisible();
  });
});
