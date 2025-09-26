import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:5173';

test.describe('Workflow monitoring dashboard', () => {
  test('streams workflow status and renders graph + logs', async ({ page }) => {
    page.on('console', (msg) => console.log('browser console:', msg.text()));
    page.on('pageerror', (err) => console.log('browser error:', err.message));
    await page.goto(`${baseUrl}/workflows`);

    await expect(page.getByTestId('workflow-monitoring-dashboard')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workflow Monitoring' })).toBeVisible();

    const ingestionButton = page.getByRole('button', {
      name: /Document Ingestion/i,
    });
    await ingestionButton.waitFor({ timeout: 15000 });
    await expect(ingestionButton).toBeVisible();

    await ingestionButton.click();

    const progressBar = page.getByRole('progressbar', {
      name: 'Workflow progress',
    });

    await expect(progressBar).toHaveAttribute('aria-valuenow', '55');

    await page.waitForTimeout(2600);

    await expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    await expect(
      page.getByText('Workflow completed successfully').first(),
    ).toBeVisible();

    await expect(page.getByText('Execution Logs')).toBeVisible();
    await expect(page.getByLabel('Workflow execution graph')).toBeVisible();
  });
});
