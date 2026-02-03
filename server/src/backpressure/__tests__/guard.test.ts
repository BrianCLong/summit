import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { BackpressureGuard } from '../guard.js';

describe('BackpressureGuard', () => {
  let guard: BackpressureGuard;

  beforeEach(() => {
    guard = BackpressureGuard.getInstance();
    guard.setEnabledOverride(null); // Reset to default
    guard.setMockQueueDepth(0);
    guard.setThreshold(100);
    process.env.BACKPRESSURE_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.BACKPRESSURE_ENABLED;
  });

  it('should not block when disabled (default)', () => {
    guard.setMockQueueDepth(200); // Above threshold
    expect(guard.shouldBlock()).toBe(false);
  });

  it('should not block when enabled and queue depth is below threshold', () => {
    process.env.BACKPRESSURE_ENABLED = 'true';
    guard.setMockQueueDepth(50);
    expect(guard.shouldBlock()).toBe(false);
  });

  it('should block when enabled and queue depth is above threshold', () => {
    process.env.BACKPRESSURE_ENABLED = 'true';
    guard.setMockQueueDepth(150);
    expect(guard.shouldBlock()).toBe(true);
  });

  it('should respect manual override', () => {
    guard.setEnabledOverride(true);
    guard.setMockQueueDepth(150);
    expect(guard.shouldBlock()).toBe(true);

    guard.setEnabledOverride(false);
    expect(guard.shouldBlock()).toBe(false);
  });
});
