import { test, expect } from '@playwright/test';

test.describe('Graph collaboration', () => {
  test('syncs graph updates across sessions', async ({ browser }) => {
    const pageOne = await browser.newPage();
    await pageOne.addInitScript(() => {
      window.sessionStorage.setItem('collabUserId', 'analyst-one');
      window.sessionStorage.setItem('collabTenantId', 'tenant-e2e');
    });
    await pageOne.goto('/');
    await pageOne.getByRole('button', { name: '🌐 Graph Visualization' }).click();
    await expect(pageOne.getByTestId('graph-collaboration-controls')).toBeVisible();

    const pageTwo = await browser.newPage();
    await pageTwo.addInitScript(() => {
      window.sessionStorage.setItem('collabUserId', 'analyst-two');
      window.sessionStorage.setItem('collabTenantId', 'tenant-e2e');
    });
    await pageTwo.goto('/');
    await pageTwo.getByRole('button', { name: '🌐 Graph Visualization' }).click();
    await expect(pageTwo.getByTestId('graph-collaboration-controls')).toBeVisible();

    await expect
      .poll(async () =>
        pageOne.evaluate(() => {
          const api = (window as any).__graphCollab?.['home-graph'];
          return api?.isConnected?.() ? 'connected' : 'connecting';
        }),
      )
      .toBe('connected');

    await pageOne.evaluate(() => {
      const api = (window as any).__graphCollab?.['home-graph'];
      api?.applyOperations?.([
        {
          type: 'node:add',
          node: {
            id: 'collab-e2e-node',
            label: 'Collaboration Node',
            x: 120,
            y: 220,
            size: 16,
            color: '#ef4444',
            risk: 3,
            confidence: 0.9,
          },
        },
      ]);
    });

    await expect
      .poll(async () =>
        pageTwo.evaluate(() => {
          const api = (window as any).__graphCollab?.['home-graph'];
          return api?.getState?.().nodes.some((node: any) => node.id === 'collab-e2e-node')
            ? 'present'
            : 'missing';
        }),
      )
      .toBe('present');

    await pageOne.evaluate(async () => {
      const api = (window as any).__graphCollab?.['home-graph'];
      await api?.commit?.();
    });

    await expect
      .poll(async () =>
        pageOne.evaluate(() => {
          const api = (window as any).__graphCollab?.['home-graph'];
          return api?.hasPendingChanges?.() ? 'pending' : 'settled';
        }),
      )
      .toBe('settled');

    await expect(pageOne.getByTestId('graph-collaboration-controls')).toContainText('Last saved');
    await pageOne.close();
    await pageTwo.close();
  });
});
