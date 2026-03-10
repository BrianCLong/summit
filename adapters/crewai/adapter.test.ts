import { describe, it, expect } from 'vitest';
import { CrewAIAdapter } from './adapter';

describe('CrewAIAdapter', () => {
  it('should emit trace with converted structure', async () => {
    const adapter = new CrewAIAdapter();
    adapter.recordEvent({ name: 'task_started' });

    const trace = await adapter.emitTrace();
    expect(trace.id).toMatch(/^ca-\d+$/);
    expect(trace.events).toHaveLength(1);
    expect(trace.events[0]).toEqual({ name: 'task_started' });
    expect(trace.timestamp).toBeGreaterThan(0);
  });

  it('should emit metrics with converted structure', async () => {
    const adapter = new CrewAIAdapter();
    adapter.recordEvent({});
    adapter.recordEvent({});

    const metrics = await adapter.emitMetrics();
    expect(metrics).toEqual({
      invocations: 2,
      tokens: 0,
      latencyMs: 0
    });
  });
});
