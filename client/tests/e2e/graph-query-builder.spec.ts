import { expect, test } from '@playwright/test';

test.describe('Graph query builder', () => {
  test('allows visual construction with validation feedback', async ({ page }) => {
    const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    let validateCalled = false;

    await page.route('**/graphql', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          const body = request.postDataJSON?.();
          const isValidation =
            body?.operationName === 'ValidateGraphQuery' ||
            (typeof body?.query === 'string' && body.query.includes('ValidateGraphQuery'));
          if (isValidation) {
            validateCalled = true;
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  validateGraphQuery: {
                    valid: true,
                    message: 'Query looks good',
                    errors: [],
                    suggestions: [],
                    normalized: JSON.stringify(body?.variables?.query ?? {}),
                  },
                },
              }),
            });
            return;
          }
        } catch (error) {
          // Swallow JSON parse issues and continue
        }
      }

      await route.continue();
    });

    await page.goto(`${baseUrl}/graph/query-builder`);
    await page.getByTestId('graph-query-builder').waitFor();

    await page.getByLabel('New node field').click();
    await page.getByRole('option', { name: 'Title' }).click();
    await page.getByLabel('New node operator').click();
    await page.getByRole('option', { name: 'contains' }).click();
    await page.getByLabel('New node value').fill('alpha network');
    await page.getByTestId('add-condition').click();

    await expect(page.getByTestId('graph-query-node')).toBeVisible();
    await expect(page.getByText('Query looks good')).toBeVisible();
    await expect.poll(() => validateCalled).toBeTruthy();
  });
});
