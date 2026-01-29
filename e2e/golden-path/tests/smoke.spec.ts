<<<<<<< HEAD
import { test, expect } from "@playwright/test";

test.describe("golden-path: smoke", () => {
  // Kill switch: skip if env var not explicitly "1"
  test.skip(process.env.GOLDEN_PATH_E2E_ENABLED !== "1", "GOLDEN_PATH_E2E_ENABLED!=1");

  test("loads consolidated frontend home", async ({ page }) => {
    // baseURL is handled by config, but we can assert it's set if we want
    await page.goto('/');
    // TODO: Add specific title expectation once confirmed
    await expect(page).toHaveTitle(/./);
=======
import { test, expect } from '@playwright/test';

test.describe('golden-path: smoke', () => {
  // Kill switch: skip if not enabled
  test.skip(process.env.GOLDEN_PATH_E2E_ENABLED !== '1', 'GOLDEN_PATH_E2E_ENABLED!=1');

  test('loads consolidated frontend home', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    console.log(`Navigating to ${baseURL}`);

    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    // Check for title or root element
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).toBeTruthy();
    expect(title).toMatch(/IntelGraph/i);

    // Verify root element is attached (React usually mounts here)
    await expect(page.locator('#root')).toBeAttached();
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
  });
});
