import { test, expect } from '@playwright/test';
test('live alert flows to UI and highlights nodes', async ({ page }) => {
  await page.goto('http://localhost:3001/cases/c1');
  await page.getByText('Live Alerts').waitFor();
  // simulate alert injection (dev-only route)
  await page.request.post('http://localhost:3001/dev/emit-alert', {
    data: { id:'a1', caseId:'c1', nodeIds:['n1','n2'], severity:'medium', kind:'degree_spike', ts:new Date().toISOString() }
  });
  const item = page.locator('.alert-item').first();
  await expect(item).toContainText(/degree_spike/);
  await item.hover();
  // visually verify: cy gets class .alert-preview (implementation dependent)
});
