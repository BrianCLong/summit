import { test, expect } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Topicality/i);
});

test("summit loads", async ({ page }) => {
  await page.goto("/summit");
  await expect(page.locator("text=Summit")).toBeVisible();
});
