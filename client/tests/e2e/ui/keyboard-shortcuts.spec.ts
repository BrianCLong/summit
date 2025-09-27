import { test, expect } from '@playwright/test';

test('user can customize keyboard shortcuts', async ({ page }) => {
  const keyboardShortcutsState = [
    {
      actionId: 'nav.search',
      description: 'Go to Search tab',
      category: 'Navigation',
      defaultKeys: ['ctrl+3'],
      customKeys: null,
      effectiveKeys: ['ctrl+3'],
      updatedAt: null,
    },
    {
      actionId: 'help.shortcuts',
      description: 'Show keyboard shortcuts',
      category: 'Help',
      defaultKeys: ['?'],
      customKeys: null,
      effectiveKeys: ['?'],
      updatedAt: null,
    },
  ];

  const savedPayloads: Array<Array<{ actionId: string; keys: string[] }>> = [];

  await page.route('**/graphql', async (route, request) => {
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' });
      return;
    }

    const fulfillJson = (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      });

    if (request.method() === 'GET') {
      const url = new URL(request.url());
      const operationName = url.searchParams.get('operationName');
      if (operationName === 'CurrentUser') {
        await fulfillJson({ me: { id: 'user-1', email: 'analyst@example.com', role: 'ANALYST' } });
        return;
      }
      if (operationName === 'GetKeyboardShortcuts') {
        await fulfillJson({ keyboardShortcuts: keyboardShortcutsState });
        return;
      }
      await fulfillJson({});
      return;
    }

    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      const operationName = body?.operationName;
      if (operationName === 'CurrentUser') {
        await fulfillJson({ me: { id: 'user-1', email: 'analyst@example.com', role: 'ANALYST' } });
        return;
      }
      if (operationName === 'GetKeyboardShortcuts') {
        await fulfillJson({ keyboardShortcuts: keyboardShortcutsState });
        return;
      }
      if (operationName === 'SaveKeyboardShortcuts') {
        const updates = body?.variables?.input ?? [];
        savedPayloads.push(updates);
        updates.forEach((update: { actionId: string; keys: string[] }) => {
          const existing = keyboardShortcutsState.find((shortcut) => shortcut.actionId === update.actionId);
          if (existing) {
            existing.customKeys = update.keys;
            existing.effectiveKeys = update.keys;
            existing.updatedAt = new Date().toISOString();
          }
        });
        await fulfillJson({ saveKeyboardShortcuts: keyboardShortcutsState });
        return;
      }
      if (operationName === 'ResetKeyboardShortcuts') {
        const actionIds: string[] | undefined = body?.variables?.actionIds ?? undefined;
        if (Array.isArray(actionIds) && actionIds.length > 0) {
          actionIds.forEach((actionId) => {
            const existing = keyboardShortcutsState.find((shortcut) => shortcut.actionId === actionId);
            if (existing) {
              existing.customKeys = null;
              existing.effectiveKeys = existing.defaultKeys;
              existing.updatedAt = new Date().toISOString();
            }
          });
        } else {
          keyboardShortcutsState.forEach((shortcut) => {
            shortcut.customKeys = null;
            shortcut.effectiveKeys = shortcut.defaultKeys;
            shortcut.updatedAt = new Date().toISOString();
          });
        }
        await fulfillJson({ resetKeyboardShortcuts: true });
        return;
      }
      await fulfillJson({});
      return;
    }

    await fulfillJson({});
  });

  await page.goto('/dashboard');

  await expect(page.locator('button', { hasText: '⌨️ Shortcuts' })).toBeVisible();
  await page.locator('button', { hasText: '⌨️ Shortcuts' }).click();

  const helpDialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
  await expect(helpDialog).toBeVisible();

  await helpDialog.getByRole('button', { name: 'Customize' }).click();

  const settingsDialog = page.getByRole('dialog', { name: 'Customize keyboard shortcuts' });
  await expect(settingsDialog).toBeVisible();

  const searchShortcutInput = settingsDialog.getByLabel('Go to Search tab');
  await searchShortcutInput.fill('ctrl+9');

  await settingsDialog.getByRole('button', { name: 'Save shortcuts' }).click();

  await expect(page.getByText('Your keyboard shortcuts were updated.')).toBeVisible();

  await expect(settingsDialog).toBeHidden();
  await expect(helpDialog).toBeHidden();

  expect(savedPayloads).toHaveLength(1);
  expect(savedPayloads[0]).toEqual([{ actionId: 'nav.search', keys: ['ctrl+9'] }]);
});
