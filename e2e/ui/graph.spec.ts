import { test, expect } from '@playwright/test';

test('Graph Workbench interactions', async ({ page }) => {
  await page.goto('/graph');
  const canvas = page.locator('#graph-root');
  await expect(canvas).toBeVisible();
  // Right click to open context menu
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    await expect(page.getByText('Expand Neighbors')).toBeVisible();
  }
  // Shift-lasso drag
  if (box) {
    await page.keyboard.down('Shift');
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 120);
    await page.mouse.up();
    await page.keyboard.up('Shift');
  }
});
