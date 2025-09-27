import { test, expect } from '@playwright/test';

test.describe('Dashboard graph exports', () => {
  test('allows exporting graph data as CSV and JSON', async ({ page }) => {
    await page.route('**/graphql', async (route, request) => {
      if (request.method() !== 'POST') {
        return route.continue();
      }

      const body = request.postDataJSON();
      const operationName = body?.operationName;

      if (operationName === 'ExportGraphData') {
        const input = body?.variables?.input;
        const format = input?.format;
        expect(format).toBeDefined();
        expect(input?.dataSource).toBeDefined();

        const payload = {
          filename: format === 'CSV' ? 'graph-export.csv' : 'graph-export.json',
          contentType: format === 'CSV' ? 'text/csv' : 'application/json',
          content:
            format === 'CSV'
              ? Buffer.from('id,name\n1,Alice').toString('base64')
              : Buffer.from(JSON.stringify([{ id: 1, name: 'Alice' }])).toString('base64'),
          contentEncoding: 'base64',
          recordCount: 1,
        };

        await route.fulfill({ status: 200, body: JSON.stringify({ data: { exportGraphData: payload } }) });
        return;
      }

      await route.fulfill({ status: 200, body: JSON.stringify({ data: {} }) });
    });

    await page.goto('/dashboard');

    const exportButton = page.getByRole('button', { name: /export data/i });
    await expect(exportButton).toBeVisible();

    await exportButton.click();
    const csvDownloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /download csv/i }).click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toBe('graph-export.csv');

    await exportButton.click();
    const jsonDownloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /download json/i }).click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toBe('graph-export.json');

    await expect(page.getByText(/export ready/i)).toBeVisible();
  });
});
