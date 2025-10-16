import { test, expect } from '@playwright/test';

test.describe('Run Viewer', () => {
  test('should render Run Viewer with runId parameter', async ({ page }) => {
    // Navigate to Run Viewer with a test run ID
    await page.goto('/runs/viewer?runId=test-run-123');

    // Should show the page title
    await expect(page.locator('h1')).toContainText('Run Viewer');

    // Should show loading state initially
    await expect(page.locator('text=Loading run data...')).toBeVisible();

    // Wait for the error state (since test-run-123 doesn't exist)
    await expect(page.locator('text=Error loading run data:')).toBeVisible({
      timeout: 10000,
    });

    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should show error for missing runId parameter', async ({ page }) => {
    // Navigate to Run Viewer without runId parameter
    await page.goto('/runs/viewer');

    // Should show error message
    await expect(page.locator('text=No runId provided')).toBeVisible();
    await expect(
      page.locator('text=Please include ?runId=<run-id> in the URL'),
    ).toBeVisible();
  });

  test('should show DAG when run data is loaded', async ({ page }) => {
    // Mock the API response
    await page.route('/api/maestro/v1/runs/*', async (route) => {
      const runId = route.url().split('/').pop();

      const mockResponse = {
        id: runId,
        name: `Test Run ${runId}`,
        status: 'completed',
        startTime: '2025-09-07T10:00:00Z',
        endTime: '2025-09-07T10:05:00Z',
        duration: 300000,
        steps: [
          {
            id: 'step-1',
            name: 'Initialize',
            state: 'completed',
            parents: [],
            duration: 5000,
            startTime: '2025-09-07T10:00:00Z',
            endTime: '2025-09-07T10:00:05Z',
          },
          {
            id: 'step-2',
            name: 'Process Data',
            state: 'completed',
            parents: ['step-1'],
            duration: 120000,
            startTime: '2025-09-07T10:00:05Z',
            endTime: '2025-09-07T10:02:05Z',
            traceId: 'trace-abc-123',
          },
          {
            id: 'step-3',
            name: 'Generate Report',
            state: 'completed',
            parents: ['step-2'],
            duration: 60000,
            startTime: '2025-09-07T10:02:05Z',
            endTime: '2025-09-07T10:03:05Z',
          },
        ],
      };

      await route.fulfill({ json: mockResponse });
    });

    await page.goto('/runs/viewer?runId=mock-run-123');

    // Should show run name and status
    await expect(page.locator('h1')).toContainText('Test Run mock-run-123');
    await expect(page.locator('text=COMPLETED')).toBeVisible();

    // Should show run duration
    await expect(page.locator('text=Duration: 300s')).toBeVisible();

    // Should render the DAG visualization (React Flow)
    await expect(
      page.locator('[role="region"][aria-label="Run graph"]'),
    ).toBeVisible();

    // Should show step nodes
    await expect(page.locator('text=Initialize')).toBeVisible();
    await expect(page.locator('text=Process Data')).toBeVisible();
    await expect(page.locator('text=Generate Report')).toBeVisible();

    // Should show traces link for steps that have traceId
    await expect(page.locator('a:has-text("Open in Traces")')).toBeVisible();

    // Should show legend
    await expect(page.locator('text=Legend')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Running')).toBeVisible();

    // Should show step statistics in footer
    await expect(page.locator('text=Steps: 3')).toBeVisible();
    await expect(page.locator('text=Completed: 3')).toBeVisible();
    await expect(page.locator('text=Running: 0')).toBeVisible();
  });

  test('should update DAG when run status changes', async ({ page }) => {
    let requestCount = 0;

    // Mock API to simulate run progression
    await page.route('/api/maestro/v1/runs/*', async (route) => {
      requestCount++;
      const runId = route.url().split('/').pop();

      let mockResponse;
      if (requestCount === 1) {
        // First request: running state
        mockResponse = {
          id: runId,
          name: `Progressive Run ${runId}`,
          status: 'running',
          steps: [
            {
              id: 'step-1',
              name: 'Initialize',
              state: 'completed',
              parents: [],
            },
            {
              id: 'step-2',
              name: 'Processing',
              state: 'running',
              parents: ['step-1'],
            },
            {
              id: 'step-3',
              name: 'Finalize',
              state: 'pending',
              parents: ['step-2'],
            },
          ],
        };
      } else {
        // Later requests: completed state
        mockResponse = {
          id: runId,
          name: `Progressive Run ${runId}`,
          status: 'completed',
          steps: [
            {
              id: 'step-1',
              name: 'Initialize',
              state: 'completed',
              parents: [],
            },
            {
              id: 'step-2',
              name: 'Processing',
              state: 'completed',
              parents: ['step-1'],
            },
            {
              id: 'step-3',
              name: 'Finalize',
              state: 'completed',
              parents: ['step-2'],
            },
          ],
        };
      }

      await route.fulfill({ json: mockResponse });
    });

    await page.goto('/runs/viewer?runId=progressive-run-123');

    // Initially should show running status
    await expect(page.locator('text=RUNNING')).toBeVisible();
    await expect(page.locator('text=Auto-refreshing (5s)')).toBeVisible();

    // Should show mixed step states
    await expect(page.locator('text=Running: 1')).toBeVisible();
    await expect(page.locator('text=Pending: 1')).toBeVisible();
    await expect(page.locator('text=Completed: 1')).toBeVisible();

    // Wait for auto-refresh (5+ seconds)
    await page.waitForTimeout(6000);

    // After auto-refresh, should show completed status
    await expect(page.locator('text=COMPLETED')).toBeVisible();
    await expect(page.locator('text=Completed: 3')).toBeVisible();
    await expect(page.locator('text=Running: 0')).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Mock successful run data
    await page.route('/api/maestro/v1/runs/*', async (route) => {
      await route.fulfill({
        json: {
          id: 'accessible-run',
          name: 'Accessibility Test Run',
          status: 'completed',
          steps: [
            {
              id: 'step-1',
              name: 'Test Step',
              state: 'completed',
              parents: [],
            },
          ],
        },
      });
    });

    await page.goto('/runs/viewer?runId=accessible-run');

    // Check ARIA labels
    await expect(
      page.locator('[role="region"][aria-label="Run graph"]'),
    ).toBeVisible();

    // Should be able to navigate to refresh button with keyboard
    await page.keyboard.press('Tab');
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeFocused();

    // Should be able to interact with React Flow controls
    const reactFlowControls = page.locator('.react-flow__controls');
    await expect(reactFlowControls).toBeVisible();
  });
});
