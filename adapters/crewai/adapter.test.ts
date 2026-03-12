import { describe, it, expect } from 'vitest';
import { CrewAIAdapter } from './adapter';

describe('CrewAIAdapter', () => {
  it('should implement SummitAgentAdapter interface', async () => {
    const adapter = new CrewAIAdapter();
    expect(adapter).toBeDefined();

    adapter.recordEvent({ type: 'task_start' });
    adapter.recordEvent({ type: 'task_end' });

    const trace = await adapter.emitTrace();
    expect(trace).toBeDefined();
    expect(trace.id).toContain('crewai-');
    expect(trace.events.length).toBe(2);

    const metrics = await adapter.emitMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.invocations).toBe(2);
  });
});
