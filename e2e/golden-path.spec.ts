import { test, expect } from "@playwright/test";

test.describe("Summit Golden Path E2E", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Bypass auth or login
    // If we use the seeded user:
    // await page.goto('/login');
    // await page.fill('input[name="email"]', 'analyst@intelgraph.tech');
    // await page.fill('input[name="password"]', 'password123');
    // await page.click('button[type="submit"]');

    // OR use the mock callback if available in dev
    await page.goto("/maestro/auth/callback?code=mock_code&state=mock_state");

    await expect(page.locator("#root")).toBeAttached();
    await page.waitForLoadState("networkidle");
  });

  test("Golden Path: Investigation -> Entities -> Graph -> Results", async ({ page }) => {
    // 1. Dashboard - Verify we are in
    await expect(page).toHaveURL(/.*dashboard/);
    console.log("✅ Dashboard loaded");

    // 2. Navigate to Investigations
    await page.click("text=Investigations"); // Adjust selector as needed
    // Or direct nav
    // await page.goto('/investigations');
    // Assuming UI has navigation

    // Verify our seeded investigation is present
    await expect(page.locator("text=Golden Path Investigation")).toBeVisible();
    console.log("✅ Found Golden Path Investigation");

    // 3. Open Investigation
    await page.click("text=Golden Path Investigation");
    await expect(page).toHaveURL(/.*investigation.*/);

    // 4. Verify Entities (John Doe, Acme Corp)
    await expect(page.locator("text=John Doe")).toBeVisible();
    await expect(page.locator("text=Acme Corp")).toBeVisible();
    console.log("✅ Entities visible");

    // 5. Verify Relationship (Graph View)
    // Switch to Graph tab if needed
    const graphTab = page.locator('button:has-text("Graph")');
    if (await graphTab.isVisible()) {
      await graphTab.click();
    }

    // Verify Graph visualization canvas exists
    await expect(page.locator("canvas")).toBeVisible();
    // Note: Can't easily assert contents of canvas, but presence is good.
    console.log("✅ Graph canvas visible");

    // 6. Copilot Interaction (Mocked if possible, or just open panel)
    // Assuming there is a Copilot button/pane
    const copilotTrigger = page.locator('[aria-label="Copilot"]');
    if (await copilotTrigger.isVisible()) {
      await copilotTrigger.click();
      await expect(page.locator("text=Ask a question")).toBeVisible();
      // await page.fill('input[placeholder="Ask Copilot..."]', 'Who does John work for?');
      // await page.press('input[placeholder="Ask Copilot..."]', 'Enter');
      // await expect(page.locator('text=Acme Corp')).toBeVisible(); // Result
    } else {
      console.log("⚠️ Copilot trigger not found - skipping interaction");
    }

    console.log("✅ Golden Path Complete");
  });
});
