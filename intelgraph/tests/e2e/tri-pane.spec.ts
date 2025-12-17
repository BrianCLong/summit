import { test, expect } from "@playwright/test";

test("open case → filter → brush → save view", async ({ page }) => {
  await page.goto(process.env.PREVIEW_URL_UI as string);
  await page.getByRole("textbox", { name: /search/i }).fill("ransomware op");
  await page.getByRole("button", { name: /open case/i }).click();
  await page.locator("#timeline .brush").dragTo(page.locator("#timeline"), { targetPosition: { x: 300, y: 10 }});
  await page.getByRole("button", { name: /save view/i }).click();
  await expect(page.getByText(/view saved/i)).toBeVisible();
});
