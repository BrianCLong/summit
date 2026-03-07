import { test, expect } from "@playwright/test";
import { AgentSessionPage } from "../support/pages/agent-session.page";

test.describe("Agent Session Lifecycle", () => {
  let agentPage: AgentSessionPage;

  test.beforeEach(async ({ page }) => {
    agentPage = new AgentSessionPage(page);
    await agentPage.navigate();
  });

  test("should create, execute and review an agent session", async ({ page }) => {
    // Mock the backend response
    await page.route("/api/maestro/runs", async (route) => {
      const json = {
        run: {
          id: "run-123",
          createdAt: new Date().toISOString(),
          status: "succeeded",
          userId: "test-user",
        },
        tasks: [
          { id: "task-1", description: "Analyze PRs", status: "succeeded" },
          { id: "task-2", description: "Generate Report", status: "succeeded" },
        ],
        results: [
          {
            task: { id: "task-1", description: "Analyze PRs", status: "succeeded" },
            artifact: { data: "PR Analysis complete. No risks found." },
          },
          {
            task: { id: "task-2", description: "Generate Report", status: "succeeded" },
            artifact: { data: "Report generated successfully." },
          },
        ],
        costSummary: {
          totalCostUSD: 0.05,
          totalInputTokens: 1000,
          totalOutputTokens: 500,
          byModel: {
            "gpt-4": { inputTokens: 1000, outputTokens: 500, costUSD: 0.05 },
          },
        },
      };
      await route.fulfill({ json });
    });

    // Create (Start Run)
    await agentPage.startSession("Analyze the last 5 PRs");

    // Execute (Wait for completion)
    await agentPage.waitForRunCompletion();

    // Review (Verify Status and Outputs)
    await agentPage.verifyTaskStatus("Analyze PRs", "Succeeded");
    await agentPage.verifyOutputContains("PR Analysis complete");

    // Verify Cost Summary
    await agentPage.verifyCostSummaryVisible();
  });

  test("should handle failed sessions gracefully", async ({ page }) => {
    // Mock the backend response for failure
    await page.route("/api/maestro/runs", async (route) => {
      const json = {
        run: {
          id: "run-fail",
          createdAt: new Date().toISOString(),
          status: "failed",
          userId: "test-user",
        },
        tasks: [{ id: "task-1", description: "Analyze PRs", status: "failed" }],
        results: [
          {
            task: {
              id: "task-1",
              description: "Analyze PRs",
              status: "failed",
              errorMessage: "API Rate Limit",
            },
            artifact: null,
          },
        ],
        costSummary: {
          totalCostUSD: 0.0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          byModel: {},
        },
      };
      await route.fulfill({ json });
    });

    await agentPage.startSession("Trigger failure");
    await agentPage.waitForRunCompletion();
    await agentPage.verifyTaskStatus("Analyze PRs", "Failed");
    await expect(page.locator("text=Error: API Rate Limit")).toBeVisible();
  });
});
