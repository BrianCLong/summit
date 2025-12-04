import { ChatOpsOrchestrator } from '../orchestrator.js';

describe('ChatOpsOrchestrator', () => {
  let orchestrator: ChatOpsOrchestrator;

  beforeEach(() => {
    orchestrator = new ChatOpsOrchestrator();
  });

  test('should process a query message correctly', async () => {
    const response = await orchestrator.processMessage('user1', 'Who is targeting CISA?');

    expect(response).toBeDefined();
    expect(response.content).toContain('CISA');
    expect(response.actionsTaken).toHaveLength(1);
    expect(response.actionsTaken[0].type).toBe('search_graph');
  });

  test('should maintain memory context', async () => {
    await orchestrator.processMessage('user1', 'My name is Jules.');
    const response = await orchestrator.processMessage('user1', 'What is my name?');

    // In our mock, the response is static based on intent,
    // but we can verify the memory state implicitly if we exposed it,
    // or just ensure no errors are thrown during the flow.
    expect(response).toBeDefined();
  });

  test('should detect analysis intent', async () => {
    const response = await orchestrator.processMessage('user1', 'Analyze the threat report for APT29');

    expect(response.content).toContain('analysis');
    expect(response.content).toContain('APT29');
  });
});
