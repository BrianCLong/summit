import { describe, it, expect } from 'vitest';
import { OpenAIAgentsAdapter } from './adapter';

describe('OpenAIAgentsAdapter', () => {
  it('should implement SummitAgentAdapter interface', async () => {
    const adapter = new OpenAIAgentsAdapter();
    expect(adapter).toBeDefined();

    adapter.recordEvent({ type: 'message' });
    adapter.recordEvent({ type: 'tool_call' });
    adapter.recordEvent({ type: 'tool_response' });

    const trace = await adapter.emitTrace();
    expect(trace).toBeDefined();
    expect(trace.id).toContain('oa-');
    expect(trace.events.length).toBe(3);

    const metrics = await adapter.emitMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.invocations).toBe(3);
  });
});
