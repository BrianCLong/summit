import { expect, test } from '@playwright/test';

test.describe('Notification Center', () => {
  test('renders notifications and updates preferences', async ({ page }) => {
    const preferenceUpdates: any[] = [];

    await page.route('**/graphql', async (route) => {
      const request = route.request();
      let body: any = {};
      try {
        body = request.postDataJSON();
      } catch (error) {
        return route.fulfill({ status: 200, body: JSON.stringify({ data: {} }) });
      }

      switch (body?.operationName) {
        case 'NotificationCenter': {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                notifications: [
                  {
                    id: 'n-1',
                    type: 'INGESTION_COMPLETE',
                    title: 'Ingestion complete',
                    message: 'The intel data lake is ready for analysis.',
                    severity: 'success',
                    timestamp: new Date().toISOString(),
                    actionId: null,
                    investigationId: 'INV-219',
                    metadata: { ingestionId: 'ing-1' },
                    expiresAt: null,
                    readAt: null,
                    status: 'unread',
                  },
                  {
                    id: 'n-2',
                    type: 'ML_JOB_STATUS',
                    title: 'Training job completed',
                    message: 'Model training finished with accuracy 92%.',
                    severity: 'info',
                    timestamp: new Date().toISOString(),
                    actionId: null,
                    investigationId: null,
                    metadata: { jobId: 'job-22', status: 'completed' },
                    expiresAt: null,
                    readAt: null,
                    status: 'unread',
                  },
                ],
                notificationPreferences: [
                  {
                    id: 'pref-1',
                    eventType: 'INGESTION_COMPLETE',
                    channels: { inApp: true, email: false, sms: false },
                    email: 'analyst@example.com',
                    phoneNumber: '+15550100',
                  },
                  {
                    id: 'pref-2',
                    eventType: 'ML_JOB_STATUS',
                    channels: { inApp: true, email: false, sms: false },
                    email: 'analyst@example.com',
                    phoneNumber: '+15550100',
                  },
                ],
                unreadNotificationCount: 2,
              },
            }),
          });
        }
        case 'UpdateNotificationPreference': {
          preferenceUpdates.push(body.variables.input);
          const responsePreference = {
            id: body.variables.input.eventType === 'ML_JOB_STATUS' ? 'pref-2' : 'pref-1',
            eventType: body.variables.input.eventType,
            channels: body.variables.input.channels,
            email: body.variables.input.email ?? 'analyst@example.com',
            phoneNumber: body.variables.input.phoneNumber ?? '+15550100',
          };
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { updateNotificationPreference: responsePreference } }),
          });
        }
        case 'MarkNotificationRead': {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { markNotificationRead: { id: body.variables.id, status: 'read', readAt: new Date().toISOString() } } }),
          });
        }
        default: {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
        }
      }
    });

    await page.goto('http://localhost:3001/');

    const openButton = page.getByRole('button', { name: 'Notifications' });
    await expect(openButton).toBeVisible();
    await openButton.click();

    await expect(page.getByText('Ingestion complete')).toBeVisible();
    await expect(page.getByText('Training job completed')).toBeVisible();

    await page.getByRole('button', { name: 'Preferences' }).click();
    const emailCheckbox = page.getByLabelText('Email').first();
    await emailCheckbox.check();

    await expect.poll(() => preferenceUpdates.length).toBeGreaterThan(0);
    await expect(preferenceUpdates[0].channels.email).toBeTruthy();

    await page.getByLabelText('Email address').fill('alerts@example.com');
    await page.getByLabelText('Email address').blur();
    await expect.poll(() => preferenceUpdates.length).toBeGreaterThan(1);
  });
});
