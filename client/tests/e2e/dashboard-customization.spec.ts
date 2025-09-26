import { test, expect } from '@playwright/test';

test.describe('Custom dashboard builder', () => {
  test('allows adding latency widget and persists layout', async ({ page }) => {
    const mutationPayloads: any[] = [];

    await page.route('**/graphql**', async (route, request) => {
      const respond = (data: unknown) =>
        route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ data }),
        });

      const url = new URL(request.url());
      const operationName = url.searchParams.get('operationName');

      if (request.method() === 'GET' && operationName === 'MaestroDashboardConfiguration') {
        return respond({ dashboardConfiguration: null });
      }

      if (request.method() === 'GET' && operationName === 'SaveDashboardConfiguration') {
        return respond({
          saveDashboardConfiguration: {
            id: 'persisted-dashboard',
            name: 'Adaptive Intelligence Dashboard',
            description: null,
            layout: 'grid',
            settings: { version: 1 },
            updatedAt: new Date().toISOString(),
            widgets: [],
          },
        });
      }

      if (request.method() === 'POST') {
        try {
          const payload = request.postDataJSON();
          if (payload?.operationName === 'MaestroDashboardConfiguration') {
            return respond({ dashboardConfiguration: null });
          }
          if (payload?.operationName === 'SaveDashboardConfiguration') {
            mutationPayloads.push(payload.variables.input);
            return respond({
              saveDashboardConfiguration: {
                id: 'persisted-dashboard',
                name: payload.variables.input.name,
                description: payload.variables.input.description ?? null,
                layout: payload.variables.input.layout,
                settings: payload.variables.input.settings ?? {},
                updatedAt: new Date().toISOString(),
                widgets: payload.variables.input.widgets.map((widget: any, index: number) => ({
                  ...widget,
                  id: widget.id ?? `widget-${index}`,
                })),
              },
            });
          }
        } catch (error) {
          // Fall through to network if the payload isn't JSON
        }
      }

      return route.continue();
    });

    await page.goto('/dashboard');

    await expect(page.getByTestId('dashboard-name-input')).toBeVisible();

    const paletteItem = page.getByTestId('palette-item-latency');
    await expect(paletteItem).toBeVisible();
    await paletteItem.dragTo(page.getByTestId('dashboard-canvas'));

    await expect(page.getByText(/p95 Latency/)).toBeVisible();

    await page.getByTestId('dashboard-save').click();

    await expect.poll(() => mutationPayloads.length).toBeGreaterThan(0);
    const saved = mutationPayloads.pop();
    expect(saved.widgets.some((widget: any) => widget.type === 'latency')).toBeTruthy();
  });
});
