import { test, expect } from '@playwright/test';

test.describe('AI Insights Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173'); // Assuming your app runs on this port
    // Wait for the graph to load if necessary
    await page.waitForSelector('[data-testid="cytoscape-graph-container"]');
  });

  test('should open and close the AI Insights Panel', async ({ page }) => {
    // Click the AI Tools button to open the panel
    await page.getByRole('button', { name: 'AI Tools' }).click();
    await expect(page.getByRole('heading', { name: 'AI Insights Panel' })).toBeVisible();

    // Click the Close button to close the panel
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'AI Insights Panel' })).not.toBeVisible();
  });

  test('should toggle highlighting', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Tools' }).click();
    const highlightSwitch = page.getByLabel('Enable Highlighting');
    await expect(highlightSwitch).not.toBeChecked();
    await highlightSwitch.check();
    await expect(highlightSwitch).toBeChecked();
    await highlightSwitch.uncheck();
    await expect(highlightSwitch).not.toBeChecked();
  });

  test('should select insight type and show relevant filter', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Tools' }).click();

    // Select Community Detection
    await page.getByLabel('Insight Type').click();
    await page.getByRole('option', { name: 'Community Detection' }).click();
    await expect(page.getByText('Community ID Filter')).toBeVisible();

    // Select Link Prediction (should hide Community ID Filter)
    await page.getByLabel('Insight Type').click();
    await page.getByRole('option', { name: 'Link Prediction' }).click();
    await expect(page.getByText('Community ID Filter')).not.toBeVisible();
  });

  test('should filter communities using the slider', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Tools' }).click();
    await page.getByLabel('Insight Type').click();
    await page.getByRole('option', { name: 'Community Detection' }).click();

    // Enable highlighting
    await page.getByLabel('Enable Highlighting').check();

    // Simulate community data being present (this would typically come from a backend)
    // For E2E, we assume the graph is loaded with some community data

    // Adjust the slider to filter communities
    const slider = page.getByRole('slider', { name: 'Time Range' }); // Slider for community ID filter
    const sliderBoundingBox = await slider.boundingBox();
    if (sliderBoundingBox) {
      // Drag the slider to a new position (e.g., filter for communities 0-50)
      await page.mouse.move(sliderBoundingBox.x + sliderBoundingBox.width / 2, sliderBoundingBox.y + sliderBoundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(sliderBoundingBox.x + sliderBoundingBox.width * 0.25, sliderBoundingBox.y + sliderBoundingBox.height / 2, { steps: 5 });
      await page.mouse.up();
    }

    // Verify that some nodes are dimmed (this is a basic check, actual visual verification is more complex)
    // This assumes that some nodes will fall outside the filtered range and get the 'dimmed' class
    await expect(page.locator('g.cy-node.dimmed')).toBeVisible();
  });

  test('should export data as CSV', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Tools' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/graph-export-\d+\.csv/);
  });

  test('should export data as JSON', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Tools' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/graph-export-\d+\.json/);
  });
});
