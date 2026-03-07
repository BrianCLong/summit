import { test, expect } from "@playwright/test";

test.describe("Conductor Tools & Evidence", () => {
  test("renders sessions and invocations list", async ({ page }) => {
    // Assuming dev server runs on localhost:3000 (Vite dev or preview)
    await page.goto("http://localhost:3000");

    // Navigate to Conductor Studio route if present
    await page.goto("http://localhost:3000/conductor");
    await page.getByRole("tab", { name: /Tools & Evidence/i }).click();

    // Expect headings to be visible
    await expect(page.getByText(/Attached MCP Sessions/i)).toBeVisible();
    await expect(page.getByText(/Tool Invocations/i)).toBeVisible();
  });
});
