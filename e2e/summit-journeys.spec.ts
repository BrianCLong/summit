import { test, expect } from '@playwright/test';

test.describe('Summit User Journeys', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to Alerts via drawer', async ({ page }) => {
    // Open drawer if menu button is present (mobile/collapsed state)
    const menuButton = page.getByLabel('Open navigation menu');
    if (await menuButton.isVisible()) {
        await menuButton.click();
    }

    // Locate the Alerts link. Using a flexible locator to catch sidebar or drawer item.
    // Assuming the text 'Alerts' is used.
    const alertsLink = page.getByRole('link', { name: 'Alerts' }).or(page.getByText('Alerts'));

    // Wait for it to be visible
    await expect(alertsLink.first()).toBeVisible();

    // Click
    await alertsLink.first().click();

    // Verify URL and Page Content
    await expect(page).toHaveURL(/.*\/alerts/);
    // Expect a heading with 'Alerts'
    await expect(page.getByRole('heading', { name: /Alerts/i }).first()).toBeVisible();
  });

  test('should navigate to Cases via drawer', async ({ page }) => {
    const menuButton = page.getByLabel('Open navigation menu');
    if (await menuButton.isVisible()) {
        await menuButton.click();
    }

    const casesLink = page.getByRole('link', { name: 'Cases' }).or(page.getByText('Cases'));
    await expect(casesLink.first()).toBeVisible();
    await casesLink.first().click();

    await expect(page).toHaveURL(/.*\/cases/);
    await expect(page.getByRole('heading', { name: /Cases/i }).first()).toBeVisible();
  });

  test('should navigate to Trust Dashboard', async ({ page }) => {
     const menuButton = page.getByLabel('Open navigation menu');
    if (await menuButton.isVisible()) {
        await menuButton.click();
    }

    const trustLink = page.getByRole('link', { name: 'Trust' }).or(page.getByText('Trust'));

    // If Trust is not in the main menu, it might be under a submenu or named differently.
    // If fails, we can try direct navigation to verify the page exists.
    if (await trustLink.first().isVisible()) {
        await trustLink.first().click();
        await expect(page).toHaveURL(/.*\/trust/);
        await expect(page.getByRole('heading', { name: /Trust/i }).first()).toBeVisible();
    } else {
        // Fallback: Direct navigation
        await page.goto('/trust');
        await expect(page).toHaveURL(/.*\/trust/);
        await expect(page.getByRole('heading', { name: /Trust/i }).first()).toBeVisible();
    }
  });

});
