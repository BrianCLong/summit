import { EvaluationRunner } from '../../src/agent-scaling/evaluation-runner';

describe('Token Burn Guard', () => {
  it('should restrict execution based on token cost budget', async () => {
    const runner = new EvaluationRunner({ maxSteps: 10, maxTokens: 200, topology: 'multi' });
    const result = await runner.runTask('expensive-task');
    // Ensure the token cost returned does not arbitrarily exceed thresholds without flagging
    expect(result.tokenCost).toBeLessThanOrEqual(20000);
  });
});
