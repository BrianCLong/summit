import { test, expect } from '@playwright/test';

test('Verify Copilot Panel', async ({ page }) => {
  // 1. Navigate to the Copilot route
  await page.goto('http://localhost:3000/copilot');

  // 2. Wait for the panel to load
  await page.waitForSelector('text=Copilot v0.9');

  // 3. Verify key elements
  await expect(page.locator('textarea[placeholder*="Ask a question"]')).toBeVisible();
  await expect(page.locator('button:has-text("Generate Cypher")')).toBeVisible();

  // 4. Test Interaction (Mocking would be needed for real backend, but we check UI state)
  const promptInput = page.locator('textarea[placeholder*="Ask a question"]');
  await promptInput.fill('Find users in Canada');

  // 5. Take screenshot
  await page.screenshot({ path: 'copilot_panel.png' });
});
