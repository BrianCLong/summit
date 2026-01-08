import { test, expect } from "@playwright/test";
import { MultiAgentPage } from "../support/pages/multi-agent.page";

test.describe("Multi-Agent Coordination", () => {
  let multiAgentPage: MultiAgentPage;

  test.beforeEach(async ({ page }) => {
    multiAgentPage = new MultiAgentPage(page);
    await multiAgentPage.navigate();
  });

  test("should navigate through coordination tabs", async ({ page }) => {
    // Verify initial tab
    await multiAgentPage.verifyTabActive("routing");

    // Web Tab
    await multiAgentPage.selectTab("web");
    await multiAgentPage.verifyTabActive("web");
    // Add specific checks for WebOrchestrator component presence
    // For now just checking visual presence implicitly by tab switch

    // Budgets Tab
    await multiAgentPage.selectTab("budgets");
    await multiAgentPage.verifyTabActive("budgets");

    // Logs Tab
    await multiAgentPage.selectTab("logs");
    await multiAgentPage.verifyTabActive("logs");
  });

  // Future tests can mock WebSocket messages or API calls for real-time coordination
});
