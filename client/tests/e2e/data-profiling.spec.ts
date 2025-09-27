import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';

const mockTables = [
  { schema: 'public', name: 'signals', rowCount: 42000 },
  { schema: 'public', name: 'events', rowCount: 1200 },
];

const mockProfile = {
  table: 'signals',
  schema: 'public',
  rowCount: 42000,
  generatedAt: '2025-02-15T12:00:00.000Z',
  columns: [
    {
      name: 'user_id',
      dataType: 'uuid',
      nullCount: 0,
      nullPercent: 0,
      distinctCount: 3,
      sampleTopValues: [
        { value: 'user-1', count: 5 },
        { value: 'user-2', count: 3 },
        { value: 'user-3', count: 2 },
      ],
      numericSummary: null,
    },
    {
      name: 'amount',
      dataType: 'numeric',
      nullCount: 4,
      nullPercent: 2.5,
      distinctCount: 8,
      sampleTopValues: [
        { value: '10.5', count: 4 },
        { value: '25.0', count: 3 },
      ],
      numericSummary: {
        min: 1.1,
        max: 99.4,
        mean: 32.4,
      },
    },
  ],
};

const fulfill = async (route: Route, data: unknown) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
};

test.describe('Data Profiling tool', () => {
  test('renders profiling insights from GraphQL', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fulfill({ status: 200, body: '' });
        return;
      }

      const request = route.request();
      const body = typeof request.postDataJSON === 'function'
        ? (request.postDataJSON() as { operationName?: string; query?: string } | undefined)
        : undefined;
      const operation = body?.operationName;

      if (operation === 'CurrentUser') {
        await fulfill(route, { me: { id: '1', email: 'analyst@summit.dev', role: 'ADMIN' } });
        return;
      }

      if (operation === 'IngestionTables') {
        await fulfill(route, { ingestionTables: mockTables });
        return;
      }

      if (operation === 'DataProfile') {
        await fulfill(route, { dataProfile: mockProfile });
        return;
      }

      if (body?.query?.includes('__typename')) {
        await fulfill(route, { __typename: 'Query' });
        return;
      }

      await fulfill(route, {});
    });

    await page.goto('/ingestion/profiling');

    await expect(page.getByTestId('data-profiling-title')).toBeVisible();

    await page.selectOption('[data-testid="table-select"]', 'signals');
    await page.getByTestId('sample-size-input').fill('2500');
    await page.getByTestId('topk-input').fill('3');

    await page.getByTestId('profile-submit').click();

    await expect(page.getByTestId('profile-summary')).toContainText('signals');
    await expect(page.getByTestId('profile-summary')).toContainText('42,000 rows');
    await expect(page.getByTestId('column-card-user_id')).toContainText('Null rate');
    await expect(page.getByTestId('column-card-user_id')).toContainText('Distinct: 3');
    await expect(page.getByTestId('column-card-amount')).toContainText('Top Values');
    await expect(page.getByTestId('column-card-amount')).toContainText('Mean');
  });
});
