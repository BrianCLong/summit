import { test, expect } from '@playwright/test';

test.describe('User Activity Analytics Dashboard', () => {
  test('renders metrics and charts from GraphQL data', async ({ page }) => {
    await page.route('**/graphql', async (route, request) => {
      const body = request.postDataJSON?.() ?? JSON.parse(request.postData() || '{}');
      const operationName = body?.operationName;

      if (operationName === 'CurrentUser') {
        await route.fulfill({
          json: {
            data: {
              me: {
                id: 'user-1',
                email: 'analyst@example.com',
                role: 'ADMIN',
              },
            },
          },
        });
        return;
      }

      if (operationName === 'UserActivityDashboard') {
        await route.fulfill({
          json: {
            data: {
              userActivitySummary: {
                totalLogins: 12,
                totalQueries: 25,
                uniqueUsers: 6,
                activeUsersByDay: [
                  { date: '2025-01-01T00:00:00.000Z', loginCount: 4, queryCount: 7 },
                  { date: '2025-01-02T00:00:00.000Z', loginCount: 8, queryCount: 18 },
                ],
                topUsers: [
                  { userId: 'analyst-1', loginCount: 5, queryCount: 10, lastActiveAt: '2025-01-02T12:00:00.000Z' },
                  { userId: 'analyst-2', loginCount: 3, queryCount: 8, lastActiveAt: '2025-01-02T10:30:00.000Z' },
                ],
              },
              recentUserActivity: [
                {
                  timestamp: '2025-01-02T11:00:00.000Z',
                  type: 'user.login',
                  userId: 'analyst-1',
                  metadata: { ip: '10.0.0.1' },
                },
                {
                  timestamp: '2025-01-02T11:05:00.000Z',
                  type: 'query.executed',
                  userId: 'analyst-1',
                  metadata: { query: 'MATCH (n) RETURN count(n)' },
                },
              ],
            },
          },
        });
        return;
      }

      await route.fulfill({ json: { data: {} } });
    });

    await page.goto('http://localhost:3000/analytics/user-activity');

    await expect(page.getByRole('heading', { name: 'User Activity Analytics' })).toBeVisible();
    await expect(page.getByTestId('total-logins')).toHaveText('12');
    await expect(page.getByTestId('total-queries')).toHaveText('25');
    await expect(page.getByTestId('unique-users')).toHaveText('6');

    await expect(page.getByLabel('User activity trend')).toBeVisible();
    await expect(page.getByLabel('Top user activity')).toBeVisible();

    await expect(page.getByRole('cell', { name: 'analyst-1' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /user.login/i })).toBeVisible();
  });
});
