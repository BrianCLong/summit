import { test, expect } from '@playwright/test';

test.describe('Dashboard feedback flow', () => {
  test('allows submitting feedback from dashboard', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}');
          if (body?.operationName === 'SubmitFeedback') {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: {
                  submitFeedback: {
                    id: 'fb-test',
                    status: 'NEW',
                    category: body.variables.input.category,
                    title: body.variables.input.title,
                    description: body.variables.input.description,
                    createdAt: new Date().toISOString(),
                    __typename: 'FeedbackSubmission',
                  },
                },
              }),
            });
          }
        } catch (error) {
          console.warn('Failed to parse GraphQL body', error);
        }
      }
      return route.continue();
    });

    await page.goto('http://localhost:3001/dashboard');

    await page.getByRole('button', { name: /share feedback/i }).click();
    await page.getByTestId('feedback-title').fill('Observability widget offline');
    await page.getByTestId('feedback-description').fill('Latency panel shows blank data after deploy.');
    await page.getByTestId('feedback-contact').fill('sre@summit.test');

    await page.getByTestId('feedback-submit').click();

    await expect(page.getByText('Feedback sent')).toBeVisible();
    await expect(page.getByRole('dialog', { name: /share product feedback/i })).toBeHidden();
  });
});
