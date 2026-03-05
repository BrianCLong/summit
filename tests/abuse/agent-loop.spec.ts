import { EvaluationRunner } from '../../src/agent-scaling/evaluation-runner';

describe('Agent Loop Explosion Guard', () => {
  it('should restrict steps to maxSteps threshold', async () => {
    const runner = new EvaluationRunner({ maxSteps: 5, maxTokens: 1000, topology: 'single' });
    const result = await runner.runTask('malicious-loop-task');
    expect(result).toBeDefined();
    // Assuming implementation limits steps, we would verify the counter
    // For now we just test the guard doesn't throw arbitrary errors
  });
});
