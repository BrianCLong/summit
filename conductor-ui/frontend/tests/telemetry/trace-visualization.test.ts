import { test, expect } from '@playwright/test';

test.describe('Trace Visualization @telemetry', () => {
  test.beforeEach(async ({ page }) => {
    // Mock telemetry endpoints
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      const mockSpans = [
        {
          spanId: 'span-001',
          traceId: 'trace-123',
          name: 'maestro.run.execute',
          kind: 1,
          startTime: Date.now() - 5000,
          endTime: Date.now() - 1000,
          duration: 4000,
          status: 1,
          attributes: {
            'maestro.run.id': 'run_001',
            'service.name': 'maestro-orchestrator',
          },
          events: [],
          links: [],
          resource: { attributes: { 'service.name': 'maestro-orchestrator' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
        {
          spanId: 'span-002',
          traceId: 'trace-123',
          parentSpanId: 'span-001',
          name: 'node.validate',
          kind: 1,
          startTime: Date.now() - 4500,
          endTime: Date.now() - 2000,
          duration: 2500,
          status: 1,
          attributes: {
            'maestro.node.id': 'validate',
            'service.name': 'maestro-worker',
          },
          events: [],
          links: [],
          resource: { attributes: { 'service.name': 'maestro-worker' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
      ];

      await route.fulfill({ json: { spans: mockSpans } });
    });

    await page.goto('/maestro/runs/run_001?tab=traces');
    await page.waitForLoadState('networkidle');
  });

  test('should display trace visualization', async ({ page }) => {
    // Check for trace visualization container
    await expect(
      page.locator('[data-testid="trace-visualization"]'),
    ).toBeVisible();
    await expect(page.locator('text=Distributed Trace')).toBeVisible();
  });

  test('should show trace metrics summary', async ({ page }) => {
    // Check metrics are displayed
    await expect(page.locator('text=Duration')).toBeVisible();
    await expect(page.locator('text=Spans')).toBeVisible();
    await expect(page.locator('text=Services')).toBeVisible();
    await expect(page.locator('text=Errors')).toBeVisible();
  });

  test('should switch between visualization modes', async ({ page }) => {
    // Test timeline view (default)
    await expect(page.locator('button:has-text("Timeline")')).toHaveClass(
      /bg-blue-100/,
    );

    // Switch to tree view
    await page.click('button:has-text("Tree")');
    await expect(page.locator('button:has-text("Tree")')).toHaveClass(
      /bg-blue-100/,
    );
    await expect(page.locator('.trace-tree')).toBeVisible();

    // Switch to flamegraph view
    await page.click('button:has-text("Flamegraph")');
    await expect(page.locator('button:has-text("Flamegraph")')).toHaveClass(
      /bg-blue-100/,
    );
    await expect(page.locator('.flamegraph')).toBeVisible();
  });

  test('should display spans in timeline view', async ({ page }) => {
    // Check timeline spans are visible
    await expect(page.locator('.timeline-span')).toHaveCount(2);
    await expect(page.locator('text=maestro.run.execute')).toBeVisible();
    await expect(page.locator('text=node.validate')).toBeVisible();
  });

  test('should show span details on selection', async ({ page }) => {
    // Click on a span
    await page.click('.timeline-span:first-child');

    // Check details sidebar appears
    await expect(page.locator('.span-details')).toBeVisible();
    await expect(page.locator('text=maestro.run.execute')).toBeVisible();
    await expect(page.locator('text=Attributes')).toBeVisible();
    await expect(page.locator('text=maestro.run.id')).toBeVisible();
  });

  test('should expand and collapse spans in tree view', async ({ page }) => {
    // Switch to tree view
    await page.click('button:has-text("Tree")');

    // Check for expand/collapse buttons
    await expect(page.locator('button:has-text("+")')).toBeVisible();

    // Expand a span
    await page.click('button:has-text("+")');
    await expect(page.locator('button:has-text("−")')).toBeVisible();

    // Should show child spans
    await expect(page.locator('text=node.validate')).toBeVisible();
  });

  test('should handle trace loading states', async ({ page }) => {
    // Test loading state by delaying response
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ json: { spans: [] } });
    });

    await page.reload();

    // Check loading indicator
    await expect(page.locator('text=Loading trace data...')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('should handle trace errors', async ({ page }) => {
    // Mock error response
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Trace service unavailable' },
      });
    });

    await page.reload();

    // Check error display
    await expect(page.locator('text=Error loading trace')).toBeVisible();
    await expect(page.locator('text=Trace service unavailable')).toBeVisible();
  });

  test('should show empty state when no traces found', async ({ page }) => {
    // Mock empty response
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      await route.fulfill({ json: { spans: [] } });
    });

    await page.reload();

    // Check empty state
    await expect(page.locator('text=No trace data available')).toBeVisible();
  });

  test('should display span status correctly', async ({ page }) => {
    // Mock spans with different statuses
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      const mockSpans = [
        {
          spanId: 'span-success',
          traceId: 'trace-123',
          name: 'successful.operation',
          status: 1, // OK
          startTime: Date.now() - 3000,
          endTime: Date.now() - 1000,
          duration: 2000,
          attributes: { 'service.name': 'test-service' },
          events: [],
          links: [],
          resource: { attributes: { 'service.name': 'test-service' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
        {
          spanId: 'span-error',
          traceId: 'trace-123',
          name: 'failed.operation',
          status: 2, // ERROR
          startTime: Date.now() - 2000,
          endTime: Date.now() - 500,
          duration: 1500,
          attributes: {
            'service.name': 'test-service',
            error: true,
            'error.type': 'ValidationError',
          },
          events: [],
          links: [],
          resource: { attributes: { 'service.name': 'test-service' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
      ];

      await route.fulfill({ json: { spans: mockSpans } });
    });

    await page.reload();

    // Check status indicators
    await expect(page.locator('.bg-green-500')).toBeVisible(); // Success span
    await expect(page.locator('.bg-red-500')).toBeVisible(); // Error span
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab through view mode buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to switch modes with keyboard
    await page.keyboard.press('Enter');

    // Tab to spans
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to select spans with keyboard
    await page.keyboard.press('Enter');

    // Details sidebar should be visible
    await expect(page.locator('.span-details')).toBeVisible();
  });

  test('should format durations correctly', async ({ page }) => {
    // Mock spans with different durations
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      const mockSpans = [
        {
          spanId: 'span-ms',
          traceId: 'trace-123',
          name: 'fast.operation',
          duration: 250, // milliseconds
          startTime: Date.now() - 1000,
          endTime: Date.now() - 750,
          status: 1,
          attributes: { 'service.name': 'test' },
          events: [],
          links: [],
          resource: { attributes: { 'service.name': 'test' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
        {
          spanId: 'span-sec',
          traceId: 'trace-123',
          name: 'slow.operation',
          duration: 5500, // seconds
          startTime: Date.now() - 6000,
          endTime: Date.now() - 500,
          status: 1,
          attributes: { 'service.name': 'test' },
          events: [],
          links: [],
          resource: { attributes: { 'service.name': 'test' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
      ];

      await route.fulfill({ json: { spans: mockSpans } });
    });

    await page.reload();

    // Check duration formatting
    await expect(page.locator('text=250.00ms')).toBeVisible();
    await expect(page.locator('text=5.50s')).toBeVisible();
  });

  test('should show span events when present', async ({ page }) => {
    // Mock span with events
    await page.route('/api/maestro/v1/telemetry/traces/*', async (route) => {
      const mockSpans = [
        {
          spanId: 'span-with-events',
          traceId: 'trace-123',
          name: 'operation.with.events',
          startTime: Date.now() - 3000,
          endTime: Date.now() - 1000,
          duration: 2000,
          status: 1,
          attributes: { 'service.name': 'test' },
          events: [
            {
              name: 'operation.started',
              timestamp: Date.now() - 3000,
              attributes: { config: 'default' },
            },
            {
              name: 'validation.completed',
              timestamp: Date.now() - 2000,
              attributes: { result: 'success' },
            },
          ],
          links: [],
          resource: { attributes: { 'service.name': 'test' } },
          instrumentationScope: { name: '@maestro/telemetry' },
        },
      ];

      await route.fulfill({ json: { spans: mockSpans } });
    });

    await page.reload();

    // Click on the span to see details
    await page.click('.timeline-span');

    // Check events are displayed in details
    await expect(page.locator('text=Events')).toBeVisible();
    await expect(page.locator('text=operation.started')).toBeVisible();
    await expect(page.locator('text=validation.completed')).toBeVisible();
  });

  test('should handle trace search functionality', async ({ page }) => {
    // Mock search endpoint
    await page.route(
      '/api/maestro/v1/telemetry/traces/search',
      async (route) => {
        const mockResults = {
          traces: [
            {
              traceId: 'trace-search-result',
              spans: [
                {
                  spanId: 'span-search',
                  traceId: 'trace-search-result',
                  name: 'searched.operation',
                  startTime: Date.now() - 10000,
                  duration: 1500,
                  status: 1,
                  attributes: { 'maestro.run.id': 'run_001' },
                  events: [],
                  links: [],
                  resource: {
                    attributes: { 'service.name': 'search-service' },
                  },
                  instrumentationScope: { name: '@maestro/telemetry' },
                },
              ],
              summary: {
                duration: 1500,
                spanCount: 1,
                errorCount: 0,
                services: ['search-service'],
              },
            },
          ],
        };

        await route.fulfill({ json: mockResults });
      },
    );

    // If there's a search functionality in the UI
    const searchButton = page.locator('button:has-text("Search")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await expect(page.locator('text=searched.operation')).toBeVisible();
    }
  });
});

test.describe('Trace Correlation', () => {
  test('should link traces to run context', async ({ page }) => {
    // Mock run-to-trace correlation endpoint
    await page.route('/api/maestro/v1/runs/*/traces', async (route) => {
      const correlatedTraces = {
        runId: 'run_001',
        traces: [
          {
            traceId: 'trace-run_001',
            startTime: Date.now() - 30000,
            duration: 25000,
            spanCount: 15,
            errorCount: 0,
            services: ['maestro-orchestrator', 'maestro-worker'],
            rootOperation: 'maestro.run.execute',
          },
        ],
      };

      await route.fulfill({ json: correlatedTraces });
    });

    await page.goto('/maestro/runs/run_001');

    // Check trace correlation is shown
    if (await page.locator('[data-testid="trace-correlation"]').isVisible()) {
      await expect(page.locator('text=trace-run_001')).toBeVisible();
      await expect(page.locator('text=25.00s')).toBeVisible();
      await expect(page.locator('text=15')).toBeVisible(); // span count
    }
  });
});
