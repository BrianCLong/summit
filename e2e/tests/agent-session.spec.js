"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_fixture_1 = require("../fixtures/auth.fixture");
auth_fixture_1.test.describe('Agent Session Lifecycle', () => {
    (0, auth_fixture_1.test)('should create new agent session successfully', async ({ agentSessionPage }) => {
        await agentSessionPage.goto();
        await agentSessionPage.createSession();
        await (0, auth_fixture_1.expect)(agentSessionPage.sessionList).toBeVisible();
        // Performance assertion
        const start = Date.now();
        await agentSessionPage.createSessionButton.click(); // Create another to measure
        const duration = Date.now() - start;
        (0, auth_fixture_1.expect)(duration).toBeLessThan(2000); // < 2s
    });
    (0, auth_fixture_1.test)('should execute agent task and show results', async ({ agentSessionPage }) => {
        await agentSessionPage.goto();
        // Assume session exists or create one
        await agentSessionPage.createSession();
        await agentSessionPage.executeTask('Analyze network traffic for anomalies');
        await (0, auth_fixture_1.expect)(agentSessionPage.resultArea).toBeVisible();
        await (0, auth_fixture_1.expect)(agentSessionPage.resultArea).toContainText(/analysis|result/i);
    });
    (0, auth_fixture_1.test)('should review agent output and provide feedback', async ({ agentSessionPage }) => {
        await agentSessionPage.goto();
        await agentSessionPage.createSession();
        await agentSessionPage.executeTask('Draft report');
        await agentSessionPage.provideFeedback('Looks good, but check the source.');
        // Assert feedback submitted (mocked check)
        await (0, auth_fixture_1.expect)(agentSessionPage.feedbackInput).toBeEmpty();
    });
    (0, auth_fixture_1.test)('should create PR from agent session', async ({ agentSessionPage }) => {
        await agentSessionPage.goto();
        await agentSessionPage.createSession();
        await agentSessionPage.createPRFromSession();
        // Verify PR creation feedback
        await (0, auth_fixture_1.expect)(agentSessionPage.page.getByText(/PR created/i)).toBeVisible();
    });
});
