import { test, expect } from '@playwright/test';

test.describe('Summit Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to Search page', async ({ page }) => {
    // Open drawer if not already open (assuming mobile/tablet or collapsed by default, but existing test implies it needs opening)
    // However, existing test says "Check for menu button... Click to open drawer".

    const menuButton = page.getByLabel('Open navigation menu');
    if (await menuButton.isVisible()) {
        await menuButton.click();
    }

    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    const searchLink = drawer.getByText('Search');
    await expect(searchLink).toBeVisible();
    await searchLink.click();

    // Verify URL or content
    await expect(page).toHaveURL(/.*search/);
    // Or check for a heading
    // await expect(page.locator('h1')).toContainText('Search');
  });

  test('should navigate to Graph Explorer page', async ({ page }) => {
    const menuButton = page.getByLabel('Open navigation menu');
    if (await menuButton.isVisible()) {
        await menuButton.click();
    }

    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();

    const graphLink = drawer.getByText('Graph Explorer');
    await expect(graphLink).toBeVisible();
    await graphLink.click();

    // Verify URL or content
    await expect(page).toHaveURL(/.*graph/);
  });
});
