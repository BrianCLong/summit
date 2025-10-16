import { test, expect } from '@playwright/test';

test('Visual Pipelines page renders and copilot suggest works', async ({
  page,
}) => {
  await page.goto('http://localhost:3000/pipelines');
  await expect(page.getByText(/Visual Pipelines/)).toBeVisible();
  await page.getByRole('button', { name: /Copilot Suggest/i }).click();
  await expect(page.getByText(/Copilot Suggestion/)).toBeVisible();
});
