import { test, expect } from '@playwright/test';
test('Copilot highlights why_paths', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Investigation' }).click();
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Confidence:')).toBeVisible();
  // Custom event fired by panel after applying classes
  const evt = await page.evaluate(() => new Promise(res=>{
    document.querySelector('#cy').addEventListener('intelgraph:why_paths_applied', (e)=>res(true), { once:true });
  }));
  expect(evt).toBeTruthy();
});