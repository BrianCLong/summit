import { deepfakeTriage } from '../ai/deepfakeTriage';
import { describe, it, test, expect } from '@jest/globals';

describe('deepfake triage', () => {
  it('returns score, facets, and latency', () => {
    const result = deepfakeTriage(Buffer.from('test'));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.facets)).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
