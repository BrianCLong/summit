import { describe, it, expect } from '@jest/globals';
import { ForkDetector } from '../ForkDetector';

describe('ForkDetector', () => {
  it('should give high entropy to decision tasks', () => {
    const task = {
      name: 'Decision Node',
      payload: { prompt: 'Please decide if this is valid.' }
    };
    const entropy = ForkDetector.calculateEntropy(task);
    expect(entropy).toBeGreaterThan(0.5);
  });

  it('should give low entropy to mechanical tasks', () => {
    const task = {
      name: 'Save to S3',
      kind: 'upload',
      payload: { bucket: 'my-bucket' }
    };
    const entropy = ForkDetector.calculateEntropy(task);
    expect(entropy).toBeLessThan(0.5);
  });

  it('should prioritize high entropy tasks', () => {
    const high = { name: 'decide', payload: {} };
    const low = { name: 'extract', payload: {} };
    const sorted = ForkDetector.prioritize([low, high]);
    expect(sorted[0]).toBe(high);
    expect(sorted[1]).toBe(low);
  });
});
