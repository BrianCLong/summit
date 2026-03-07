import { test, expect } from "@playwright/test";

test.describe("Performance Benchmarks", () => {
  test("should load dashboard within performance budget", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/maestro/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Dashboard Load Time: ${duration}ms`);
    expect(duration).toBeLessThan(3000); // 3s budget
  });

  test("should execute maestro run within reasonable time (mocked)", async ({ page }) => {
    // Mock fast response
    await page.route("/api/maestro/runs", async (route) => {
      await route.fulfill({
        json: {
          run: {
            id: "perf-run",
            createdAt: new Date().toISOString(),
            status: "succeeded",
            userId: "perf-user",
          },
          tasks: [],
          results: [],
          costSummary: { totalCostUSD: 0, totalInputTokens: 0, totalOutputTokens: 0, byModel: {} },
        },
      });
    });

    await page.goto("/maestro/runs");
    const input = page.locator('textarea[placeholder*="Describe what you want Maestro to do"]');
    await input.fill("Performance Test");

    const startTime = Date.now();
    await page.getByRole("button", { name: /Run with Maestro/i }).click();
    await expect(page.getByRole("button", { name: /Run with Maestro/i })).toBeVisible(); // Waits for "Running..." to disappear
    const endTime = Date.now();

    const duration = endTime - startTime;
    console.log(`Maestro Run Interaction Time: ${duration}ms`);
    expect(duration).toBeLessThan(1000); // 1s budget for UI interaction cycle with mocked backend
  });
});
