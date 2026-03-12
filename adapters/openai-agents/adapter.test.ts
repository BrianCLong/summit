import { describe, it, expect } from 'vitest';
import { OpenAIAgentsAdapter } from './adapter';

describe('OpenAIAgentsAdapter', () => {
  it('should emit trace with converted structure', async () => {
    const adapter = new OpenAIAgentsAdapter();
    adapter.recordEvent({ name: 'thread_created' });

    const trace = await adapter.emitTrace();
    expect(trace.id).toMatch(/^oa-\d+$/);
    expect(trace.events).toHaveLength(1);
    expect(trace.events[0]).toEqual({ name: 'thread_created' });
    expect(trace.timestamp).toBeGreaterThan(0);
  });

  it('should emit metrics with converted structure', async () => {
    const adapter = new OpenAIAgentsAdapter();
    adapter.recordEvent({});

    const metrics = await adapter.emitMetrics();
    expect(metrics).toEqual({
      invocations: 1,
      tokens: 0,
      latencyMs: 0
    });
  });
});
