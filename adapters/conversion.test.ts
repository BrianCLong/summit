import { describe, it, expect } from 'vitest';
import { convertToSummitTrace, convertToSummitMetrics } from './conversion';

describe('Conversion utilities', () => {
  it('should convert trace', () => {
    const trace = convertToSummitTrace('lg', [{ msg: 'test' }]);
    expect(trace.id).toContain('lg-');
    expect(trace.events.length).toBe(1);
    expect(trace.events[0].msg).toBe('test');
  });

  it('should convert metrics', () => {
    const metrics = convertToSummitMetrics({ tokens: 100 });
    expect(metrics.invocations).toBe(0);
    expect(metrics.tokens).toBe(100);
    expect(metrics.latencyMs).toBe(0);
  });
});
