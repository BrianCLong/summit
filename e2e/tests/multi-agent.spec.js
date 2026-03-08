"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const multi_agent_page_1 = require("../support/pages/multi-agent.page");
test_1.test.describe('Multi-Agent Coordination', () => {
    let multiAgentPage;
    test_1.test.beforeEach(async ({ page }) => {
        multiAgentPage = new multi_agent_page_1.MultiAgentPage(page);
        await multiAgentPage.navigate();
    });
    (0, test_1.test)('should navigate through coordination tabs', async ({ page }) => {
        // Verify initial tab
        await multiAgentPage.verifyTabActive('routing');
        // Web Tab
        await multiAgentPage.selectTab('web');
        await multiAgentPage.verifyTabActive('web');
        // Add specific checks for WebOrchestrator component presence
        // For now just checking visual presence implicitly by tab switch
        // Budgets Tab
        await multiAgentPage.selectTab('budgets');
        await multiAgentPage.verifyTabActive('budgets');
        // Logs Tab
        await multiAgentPage.selectTab('logs');
        await multiAgentPage.verifyTabActive('logs');
    });
    // Future tests can mock WebSocket messages or API calls for real-time coordination
});
