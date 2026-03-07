import { test, expect } from "../fixtures/auth.fixture";

test.describe("Visual Regression", () => {
  test("dashboard visual comparison", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveScreenshot("dashboard.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("graph visualization visual comparison", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/explore");
    // Wait for graph to load (network idle is a good proxy for data fetching)
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(authenticatedPage).toHaveScreenshot("graph-viz.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("agent UI visual comparison", async ({ agentSessionPage }) => {
    await agentSessionPage.goto();
    await agentSessionPage.page.waitForLoadState("networkidle");
    await expect(agentSessionPage.page).toHaveScreenshot("agent-ui.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
