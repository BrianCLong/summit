import { expect, test } from '@playwright/test';

test('graph query debugger surfaces plan, metrics, and suggestions', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const body = request.postData() ? JSON.parse(request.postData()!) : {};
    if (body?.operationName === 'CurrentUser') {
      await route.fulfill({
        json: {
          data: {
            me: { id: 'user-1', email: 'analyst@example.com', role: 'ADMIN' },
          },
        },
      });
      return;
    }

    if (typeof body?.query === 'string' && body.query.includes('graphQueryDebug')) {
      await route.fulfill({
        json: {
          data: {
            graphQueryDebug: {
              cypher: 'MATCH (e:Entity { tenantId: $tenantId }) RETURN e LIMIT 25',
              parameters: { tenantId: 'demo-tenant' },
              plan: {
                operatorType: 'ProduceResults',
                identifiers: ['result'],
                arguments: { columns: ['result'] },
                children: [
                  {
                    operatorType: 'Projection',
                    identifiers: ['result'],
                    arguments: { expressions: ['result'] },
                    children: [
                      {
                        operatorType: 'NodeByLabelScan',
                        identifiers: ['e'],
                        arguments: { label: 'Entity' },
                        children: [],
                      },
                    ],
                  },
                ],
              },
              planSummary: 'Query type: READ_ONLY • Contains updates: no',
              suggestions: [
                {
                  title: 'Add index on Entity(tenantId)',
                  detail: 'Consider creating an index on Entity.tenantId for faster lookups.',
                  level: 'medium',
                  applied: false,
                },
              ],
              errors: [],
              metrics: {
                estimatedCost: 1.37,
                complexity: 4,
                nodeCount: 2,
                relationshipCount: 1,
                requiredIndexes: ['Entity(tenantId)'],
              },
            },
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: {} } });
  });

  await page.goto('/graph/debug');
  await expect(page.getByRole('heading', { name: 'Graph Query Debugger' })).toBeVisible();

  await page.getByRole('button', { name: 'Run Debugger' }).click();

  await expect(page.getByText('MATCH (e:Entity')).toBeVisible();
  await expect(page.getByText('Add index on Entity(tenantId)')).toBeVisible();
  await expect(page.getByText('Estimated Cost', { exact: false })).toBeVisible();
  await expect(page.getByText('ProduceResults')).toBeVisible();
});
