import { test, expect } from '@playwright/test';

test.describe('Graph visualization preferences', () => {
  test('allows selecting layout and persists analyst preference', async ({ page }) => {
    let lastMutation: any = null;

    await page.route('**/graphql', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }

      const body = JSON.parse(route.request().postData() || '{}');
      switch (body.operationName) {
        case 'GetGraphLayoutPreference':
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                graphLayoutPreference: {
                  layout: 'force',
                  physicsEnabled: true,
                  options: { orientation: 'vertical' },
                  updatedAt: new Date().toISOString(),
                },
              },
            }),
          });
          return;
        case 'GetGraphData':
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                graphData: {
                  nodes: [
                    { id: 'a', label: 'Analyst', type: 'PERSON' },
                    { id: 'b', label: 'Target', type: 'PERSON' },
                    { id: 'c', label: 'Org', type: 'ORGANIZATION' },
                  ],
                  edges: [
                    { id: 'ab', fromEntityId: 'a', toEntityId: 'b', label: 'Investigates' },
                    { id: 'bc', fromEntityId: 'b', toEntityId: 'c', label: 'Linked To' },
                  ],
                },
              },
            }),
          });
          return;
        case 'SaveGraphLayoutPreference':
          lastMutation = body.variables.input;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                saveGraphLayoutPreference: {
                  layout: body.variables.input.layout,
                  physicsEnabled: body.variables.input.physicsEnabled,
                  options: body.variables.input.options ?? {},
                  updatedAt: new Date().toISOString(),
                },
              },
            }),
          });
          return;
        default:
          route.continue();
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: '🌐 Graph Visualization' }).click();

    await expect(page.getByTestId('graph-layout-preferences')).toBeVisible();

    const hierarchicalButton = page.getByTestId('graph-layout-hierarchical');
    await hierarchicalButton.click();
    await expect(hierarchicalButton).toHaveAttribute('aria-pressed', 'true');

    await expect.poll(() => lastMutation?.layout).toBe('hierarchical');

    const physicsToggle = page.getByLabel('Enable physics simulation');
    await physicsToggle.click();
    await expect.poll(() => lastMutation?.physicsEnabled).toBe(false);

    const orientationSelect = page.getByLabel('Layout orientation');
    await orientationSelect.selectOption('horizontal');
    await expect.poll(() => lastMutation?.options?.orientation).toBe('horizontal');
  });
});
