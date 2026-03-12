import { describe, it, expect } from 'vitest';
import { AutoGenAdapter } from './adapter';

describe('AutoGenAdapter', () => {
  it('should implement SummitAgentAdapter interface', async () => {
    const adapter = new AutoGenAdapter();
    expect(adapter).toBeDefined();

    adapter.recordEvent({ type: 'agent_start' });

    const trace = await adapter.emitTrace();
    expect(trace).toBeDefined();
    expect(trace.id).toContain('ag-');
    expect(trace.events.length).toBe(1);

    const metrics = await adapter.emitMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.invocations).toBe(1);
  });
});
