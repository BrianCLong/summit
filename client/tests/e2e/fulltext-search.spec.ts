import { expect, test } from '@playwright/test';

test('global full-text search surfaces Elasticsearch-backed results', async ({ page }) => {
  let capturedRequest: any;

  await page.route('**/graphql', async (route, request) => {
    const body = request.postDataJSON?.();
    if (body?.operationName === 'FullTextSearch') {
      capturedRequest = body;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            fullTextSearch: {
              total: 1,
              tookMs: 9,
              results: [
                {
                  id: 'entity-42',
                  type: 'PERSON',
                  nodeType: 'PERSON',
                  title: 'Dana Analyst',
                  summary: 'Senior threat analyst focused on APT detections.',
                  score: 0.91,
                  source: 'GRAPH',
                  tenantId: 'tenant-alpha',
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-03T00:00:00Z',
                },
              ],
            },
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto(`${process.env.WEB_URL}/search`);
  await page.getByTestId('fulltext-search-input').fill('threat intel');
  await page.getByTestId('fulltext-search-button').click();

  await expect(page.getByTestId('fulltext-search-summary')).toContainText('Showing 1 of 1 results');
  await expect(page.getByText('Dana Analyst')).toBeVisible();
  await expect(page.getByText('Senior threat analyst focused on APT detections.')).toBeVisible();

  await expect.poll(async () => capturedRequest?.variables?.input?.query).toBe('threat intel');
  await expect.poll(async () => capturedRequest?.variables?.input?.sources).toEqual(['GRAPH', 'INGESTED']);
  await expect.poll(async () => capturedRequest?.variables?.input?.nodeTypes ?? null).toBeNull();
});
