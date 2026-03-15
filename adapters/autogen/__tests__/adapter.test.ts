import { AutoGenAdapter } from '../adapter';

describe('AutoGenAdapter', () => {
  it('records events and emits trace with summit format', async () => {
    const adapter = new AutoGenAdapter();
    adapter.recordEvent({ type: 'message', content: 'hello' });

    const trace = await adapter.emitTrace();
    expect(trace.events.length).toBe(1);
    expect(trace.events[0].content).toBe('hello');
    expect(trace.events[0].summitFormat).toBe(true);
    expect(trace.events[0].sourceFramework).toBe('autogen');

    const metrics = await adapter.emitMetrics();
    expect(metrics.invocations).toBe(1);
  });
});
