import { createDiagnosticsTimeline } from '../src/runtime/diagnostics.js';
import type { NanoEvent } from '../src/runtime/types.js';

describe('RingDiagnosticsTimeline', () => {
  it('keeps a bounded history and summarizes counts', () => {
    const timeline = createDiagnosticsTimeline();
    const baseEvent: NanoEvent = {
      type: 'test',
      payload: {},
      timestamp: new Date()
    };
    timeline.push({
      event: baseEvent,
      emittedAt: new Date().toISOString(),
      status: 'processed'
    });
    timeline.push({
      event: baseEvent,
      emittedAt: new Date().toISOString(),
      status: 'failed',
      error: 'boom',
      plugin: 'unit'
    });
    expect(timeline.last(1)).toHaveLength(1);
    const summary = timeline.summarize();
    expect(summary.metrics['diagnostics.success']).toBe(1);
    expect(summary.metrics['diagnostics.failed']).toBe(1);
    expect(summary.events.length).toBe(2);
  });

  it('returns empty array when requesting zero events', () => {
    const timeline = createDiagnosticsTimeline();
    expect(timeline.last(0)).toEqual([]);
  });

  it('evicts old entries when capacity is exceeded', () => {
    const timeline = createDiagnosticsTimeline();
    for (let i = 0; i < 510; i += 1) {
      timeline.push({
        event: { type: 'bulk', payload: { idx: i }, timestamp: new Date() },
        emittedAt: new Date().toISOString(),
        status: 'processed'
      });
    }
    expect(timeline.last(510).length).toBe(500);
  });
});
