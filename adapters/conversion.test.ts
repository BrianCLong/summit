import { describe, it, expect } from 'vitest';
import { convertToTrace, convertToMetrics } from './conversion';

describe('Conversion Utilities', () => {
  it('should correctly convert to Trace', () => {
    const id = 'test-id';
    const events = [{ type: 'test' }];

    const trace = convertToTrace(id, events);

    expect(trace.id).toBe(id);
    expect(trace.events).toEqual(events);
    expect(trace.timestamp).toBeGreaterThan(0);
  });

  it('should correctly convert to Metrics', () => {
    const invocations = 5;
    const tokens = 100;
    const latencyMs = 200;

    const metrics = convertToMetrics(invocations, tokens, latencyMs);

    expect(metrics).toEqual({
      invocations,
      tokens,
      latencyMs
    });
  });
});
