import { describe, it, expect } from 'vitest';
import { AutoGenAdapter } from './adapter';

describe('AutoGenAdapter', () => {
  it('should emit trace with converted structure', async () => {
    const adapter = new AutoGenAdapter();
    adapter.recordEvent({ name: 'message_sent' });

    const trace = await adapter.emitTrace();
    expect(trace.id).toMatch(/^ag-\d+$/);
    expect(trace.events).toHaveLength(1);
    expect(trace.events[0]).toEqual({ name: 'message_sent' });
    expect(trace.timestamp).toBeGreaterThan(0);
  });

  it('should emit metrics with converted structure', async () => {
    const adapter = new AutoGenAdapter();
    adapter.recordEvent({});
    adapter.recordEvent({});
    adapter.recordEvent({});

    const metrics = await adapter.emitMetrics();
    expect(metrics).toEqual({
      invocations: 3,
      tokens: 0,
      latencyMs: 0
    });
  });
});
