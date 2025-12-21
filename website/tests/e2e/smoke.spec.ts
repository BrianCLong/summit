import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads and displays Topicality branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Topicality/i);
    await expect(page.locator('text=Topicality')).toBeVisible();
  });

  test('summit page loads and displays content', async ({ page }) => {
    await page.goto('/summit');
    await expect(page.locator('text=Summit')).toBeVisible();
    await expect(
      page.locator('text=intelligence workflows'),
    ).toBeVisible();
  });

  test('navigation works from home to summit', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Explore Summit');
    await expect(page).toHaveURL('/summit');
    await expect(page.locator('text=Summit')).toBeVisible();
  });

  test('summit sub-navigation works', async ({ page }) => {
    await page.goto('/summit');

    // Click Capabilities link
    await page.click('text=Capabilities');
    await expect(page).toHaveURL('/summit/capabilities');
    await expect(page.locator('h1:has-text("Capabilities")')).toBeVisible();

    // Click Architecture link
    await page.click('text=Architecture');
    await expect(page).toHaveURL('/summit/architecture');
    await expect(page.locator('h1:has-text("Architecture")')).toBeVisible();
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.service).toBe('topicality-website');
  });

  test('initiatives page loads', async ({ page }) => {
    await page.goto('/initiatives');
    await expect(page.locator('h1:has-text("Initiatives")')).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1:has-text("About")')).toBeVisible();
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1:has-text("Contact")')).toBeVisible();
  });
});
