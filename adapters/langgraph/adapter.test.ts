import { describe, it, expect } from 'vitest';
import { LangGraphAdapter } from './adapter';

describe('LangGraphAdapter', () => {
  it('should implement SummitAgentAdapter interface', async () => {
    const adapter = new LangGraphAdapter();
    expect(adapter).toBeDefined();

    adapter.recordEvent({ type: 'start' });
    adapter.recordEvent({ type: 'end' });

    const trace = await adapter.emitTrace();
    expect(trace).toBeDefined();
    expect(trace.id).toContain('lg-');
    expect(trace.events.length).toBe(2);

    const metrics = await adapter.emitMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.invocations).toBe(2);
  });
});
