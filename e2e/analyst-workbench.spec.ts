import { test, expect } from '@playwright/test';

test('Analyst Workbench Smoke Test', async ({ page }) => {
  // 1. Navigate to Cases Page
  await page.goto('/cases');
  await expect(page).toHaveTitle(/Cases/); // Adjust based on actual title if available
  await expect(page.getByText('Cases')).toBeVisible();

  // 2. Verify Case List
  const caseCard = page.getByText('Suspicious Financial Activity').first();
  await expect(caseCard).toBeVisible();

  // 3. Navigate to Case Detail
  await caseCard.click();
  await expect(page.getByText('Case Description')).toBeVisible();

  // 4. Verify Analyst Workbench Tab
  await page.getByRole('tab', { name: 'Analyst Workbench' }).click();
  await expect(page.getByText('Analyst Console')).toBeVisible();

  // 5. Verify Panes
  await expect(page.getByText('Entity Graph')).toBeVisible();
  await expect(page.getByText('Timeline')).toBeVisible();
  await expect(page.getByText('Geographic View')).toBeVisible();
  await expect(page.getByText('Explain This View')).toBeVisible();

  // 6. Test Interaction (Simple Selection)
  // Assuming graph nodes are clickable, this might need refinement based on actual SVG structure
  // For now, we just verify visibility of components
});
