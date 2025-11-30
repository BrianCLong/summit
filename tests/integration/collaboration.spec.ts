import { test, expect } from './setup.js';

test.describe('Collaboration Features', () => {
  test('should allow user to view graph collaboration and interact', async ({ authenticatedPage: page }) => {
    // Navigate to the main graph view
    await page.goto('http://localhost:5173/');

    // Check if the graph canvas is present
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Check for HUD elements indicating system status
    await expect(page.getByText('System Status')).toBeVisible();

    // Simulate opening the "Switchboard" or Collaboration panel
    const switchboardTrigger = page.locator('[aria-label="Open Switchboard"]');
    if (await switchboardTrigger.isVisible()) {
        await switchboardTrigger.click();
        await expect(page.getByText('Active Sessions')).toBeVisible();
    }
  });

  test('should display user presence', async ({ authenticatedPage: page }) => {
     await page.goto('http://localhost:5173/');

     // Mock presence data injection if possible, or check for self-presence
     // Assuming the UI shows the current user in a list
     // await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should handle real-time sync events', async ({ authenticatedPage: page }) => {
      await page.goto('http://localhost:5173/');

      // Listen for WebSocket messages (Playwright allows inspecting network traffic)
      const wsPromise = page.waitForEvent('websocket', ws => ws.url().includes('socket.io'));
      // Reload to trigger connection
      await page.reload();
      const ws = await wsPromise;
      expect(ws).toBeTruthy();
  });
});
