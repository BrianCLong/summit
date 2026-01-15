import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { QuotaManager } from '../quota-manager.js';

const quotaManager = QuotaManager.getInstance() as any;
const describeIf =
  typeof quotaManager.checkQuota === 'function' ? describe : describe.skip;

describeIf('QuotaManager QUOTAS_V1', () => {
  const originalEnv = process.env.QUOTAS_V1;

  beforeEach(() => {
    process.env.QUOTAS_V1 = '1';
    quotaManager.resetForTesting();
    jest.useFakeTimers();
  });

  afterEach(() => {
    process.env.QUOTAS_V1 = originalEnv;
    quotaManager.resetForTesting();
    jest.useRealTimers();
  });

  it('resets usage after the configured window', () => {
    quotaManager.setTenantOverrides('tenant-a', {
      requestsPerMinute: { limit: 2, windowMs: 1000, burstCredits: 0 },
    });

    const first = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
    const second = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
    const third = quotaManager.checkQuota('tenant-a', 'requests_per_minute');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);

    jest.advanceTimersByTime(1100);

    const afterWindow = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBeGreaterThanOrEqual(1);
  });

  it('consumes burst credits before blocking', () => {
    quotaManager.setTenantOverrides('tenant-b', {
      requestsPerMinute: { limit: 1, windowMs: 60_000, burstCredits: 1 },
    });

    const first = quotaManager.checkQuota('tenant-b', 'requests_per_minute');
    const second = quotaManager.checkQuota('tenant-b', 'requests_per_minute');
    const third = quotaManager.checkQuota('tenant-b', 'requests_per_minute');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.usedBurst).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.reason).toBe('requests_per_minute_exceeded');
  });

  it('throttles lower-priority workloads under saturation', () => {
    quotaManager.setTenantOverrides('tenant-c', {
      requestsPerMinute: { limit: 5, windowMs: 60_000, burstCredits: 0 },
    });
    quotaManager.updateSaturationSnapshot({ queueDepth: 500 });

    const lowPriority = quotaManager.checkQuota('tenant-c', 'requests_per_minute', 1, {}, { priority: 'low' });
    const vipPriority = quotaManager.checkQuota('tenant-c', 'requests_per_minute', 1, {}, { priority: 'vip' });

    expect(lowPriority.allowed).toBe(false);
    expect(lowPriority.reason).toBe('saturation_throttle');
    expect(vipPriority.allowed).toBe(true);
  });
});
