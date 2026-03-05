import { describe, it, expect } from 'vitest';
import { AgentRuntime, AgentInput, AgentContext, AgentOutput } from '../AgentRuntime';

class MockRuntime implements AgentRuntime {
  id = 'mock-runtime-01';
  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    return {
      result: `Mock result for ${input.prompt} with user ${ctx.userId}`
    };
  }
}

describe('AgentRuntime', () => {
  it('should define an interface that can be implemented', async () => {
    const runtime = new MockRuntime();
    expect(runtime.id).toBe('mock-runtime-01');

    const input: AgentInput = { prompt: 'hello' };
    const ctx: AgentContext = { userId: 'u1', sessionId: 's1' };

    const output = await runtime.run(input, ctx);
    expect(output.result).toBe('Mock result for hello with user u1');
  });
});
