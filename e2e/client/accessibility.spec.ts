import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; // 1

test.describe('homepage accessibility and visual regression tests', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/'); // Replace with your actual homepage URL

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze(); // 2

    expect(accessibilityScanResults.violations).toEqual([]); // 3
  });

  test('should match the visual regression snapshot', async ({ page }) => {
    await page.goto('/'); // Replace with your actual homepage URL

    // Take a screenshot of the entire page
    await expect(page).toHaveScreenshot('homepage.png'); // 4
  });
});