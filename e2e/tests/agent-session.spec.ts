import { test, expect } from "../fixtures/auth.fixture";

test.describe("Agent Session Lifecycle", () => {
  test("should create new agent session successfully", async ({ agentSessionPage }) => {
    await agentSessionPage.goto();
    await agentSessionPage.createSession();
    await expect(agentSessionPage.sessionList).toBeVisible();
    // Performance assertion
    const start = Date.now();
    await agentSessionPage.createSessionButton.click(); // Create another to measure
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000); // < 2s
  });

  test("should execute agent task and show results", async ({ agentSessionPage }) => {
    await agentSessionPage.goto();
    // Assume session exists or create one
    await agentSessionPage.createSession();
    await agentSessionPage.executeTask("Analyze network traffic for anomalies");
    await expect(agentSessionPage.resultArea).toBeVisible();
    await expect(agentSessionPage.resultArea).toContainText(/analysis|result/i);
  });

  test("should review agent output and provide feedback", async ({ agentSessionPage }) => {
    await agentSessionPage.goto();
    await agentSessionPage.createSession();
    await agentSessionPage.executeTask("Draft report");
    await agentSessionPage.provideFeedback("Looks good, but check the source.");
    // Assert feedback submitted (mocked check)
    await expect(agentSessionPage.feedbackInput).toBeEmpty();
  });

  test("should create PR from agent session", async ({ agentSessionPage }) => {
    await agentSessionPage.goto();
    await agentSessionPage.createSession();
    await agentSessionPage.createPRFromSession();
    // Verify PR creation feedback
    await expect(agentSessionPage.page.getByText(/PR created/i)).toBeVisible();
  });
});
