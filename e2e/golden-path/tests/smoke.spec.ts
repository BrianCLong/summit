import { test, expect } from "@playwright/test";

test.describe("golden-path: smoke", () => {
  // Kill switch: skip if env var not explicitly "1"
  test.skip(process.env.GOLDEN_PATH_E2E_ENABLED !== "1", "GOLDEN_PATH_E2E_ENABLED!=1");

  test("loads consolidated frontend home", async ({ page }) => {
    // baseURL is handled by config, but we can assert it's set if we want
    await page.goto('/');
    // TODO: Add specific title expectation once confirmed
    await expect(page).toHaveTitle(/./);
  });
});
