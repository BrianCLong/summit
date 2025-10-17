import { createMetricsRegistry } from '../src/runtime/metrics.js';

describe('InMemoryMetricsRegistry', () => {
  it('tracks counters, gauges, and durations', () => {
    const registry = createMetricsRegistry();
    registry.recordCounter('events');
    registry.recordCounter('events', 2);
    registry.recordGauge('gauge', 10);
    registry.recordDuration('duration', 5);
    registry.recordDuration('duration', 15);
    const snapshot = registry.snapshot();
    expect(snapshot.events).toBe(3);
    expect(snapshot.gauge).toBe(10);
    expect(snapshot['duration.avg']).toBe(10);
    expect(snapshot['duration.count']).toBe(2);
  });
});
