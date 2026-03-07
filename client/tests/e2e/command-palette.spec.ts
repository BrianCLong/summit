import { test, expect } from "@playwright/test";

test("command palette jumps to case workspace and focuses input", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: /Command palette/i });
  await expect(dialog).toBeVisible();

  await page.getByLabel("Command palette search").fill("case");
  await page.getByRole("option", { name: /Open case workspace/i }).click();

  await expect(page).toHaveURL(/\/cases/);
  await expect(page.getByLabel("Name")).toBeFocused();
});
