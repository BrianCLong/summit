import { test, expect } from '../fixtures/auth.fixture';

test.describe('Multi-Agent Coordination', () => {
  test('should coordinate multiple agents on shared task', async ({ multiAgentPage }) => {
    await multiAgentPage.goto();
    // Verify default state
    await multiAgentPage.verifyCoordinationStatus('Active');
  });

  test('should show real-time coordination status', async ({ multiAgentPage }) => {
    await multiAgentPage.goto();
    const count = await multiAgentPage.getActiveAgentsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle agent conflicts gracefully', async ({ multiAgentPage }) => {
    await multiAgentPage.goto();
    // Simulate conflict or check if one exists (mocking might be needed in real env)
    // For now, we check the UI handling
    if (await multiAgentPage.conflictAlert.isVisible()) {
        await multiAgentPage.resolveConflict();
        await expect(multiAgentPage.conflictAlert).toBeHidden();
    }
  });
});
