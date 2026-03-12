import { describe, it, expect } from 'vitest';
import { LangGraphAdapter } from './adapter';

describe('LangGraphAdapter', () => {
  it('should emit trace with converted structure', async () => {
    const adapter = new LangGraphAdapter();
    adapter.recordEvent({ name: 'node_run' });

    const trace = await adapter.emitTrace();
    expect(trace.id).toMatch(/^lg-\d+$/);
    expect(trace.events).toHaveLength(1);
    expect(trace.events[0]).toEqual({ name: 'node_run' });
    expect(trace.timestamp).toBeGreaterThan(0);
  });

  it('should emit metrics with converted structure', async () => {
    const adapter = new LangGraphAdapter();
    adapter.recordEvent({});

    const metrics = await adapter.emitMetrics();
    expect(metrics).toEqual({
      invocations: 1,
      tokens: 0,
      latencyMs: 0
    });
  });
});
