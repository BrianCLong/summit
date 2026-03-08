"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const quota_manager_js_1 = require("../quota-manager.js");
const quotaManager = quota_manager_js_1.QuotaManager.getInstance();
const describeIf = typeof quotaManager.checkQuota === 'function' ? globals_1.describe : globals_1.describe.skip;
describeIf('QuotaManager QUOTAS_V1', () => {
    const originalEnv = process.env.QUOTAS_V1;
    (0, globals_1.beforeEach)(() => {
        process.env.QUOTAS_V1 = '1';
        quotaManager.resetForTesting();
        globals_1.jest.useFakeTimers();
    });
    (0, globals_1.afterEach)(() => {
        process.env.QUOTAS_V1 = originalEnv;
        quotaManager.resetForTesting();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('resets usage after the configured window', () => {
        quotaManager.setTenantOverrides('tenant-a', {
            requestsPerMinute: { limit: 2, windowMs: 1000, burstCredits: 0 },
        });
        const first = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
        const second = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
        const third = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(second.allowed).toBe(true);
        (0, globals_1.expect)(third.allowed).toBe(false);
        globals_1.jest.advanceTimersByTime(1100);
        const afterWindow = quotaManager.checkQuota('tenant-a', 'requests_per_minute');
        (0, globals_1.expect)(afterWindow.allowed).toBe(true);
        (0, globals_1.expect)(afterWindow.remaining).toBeGreaterThanOrEqual(1);
    });
    (0, globals_1.it)('consumes burst credits before blocking', () => {
        quotaManager.setTenantOverrides('tenant-b', {
            requestsPerMinute: { limit: 1, windowMs: 60_000, burstCredits: 1 },
        });
        const first = quotaManager.checkQuota('tenant-b', 'requests_per_minute');
        const second = quotaManager.checkQuota('tenant-b', 'requests_per_minute');
        const third = quotaManager.checkQuota('tenant-b', 'requests_per_minute');
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(second.allowed).toBe(true);
        (0, globals_1.expect)(second.usedBurst).toBe(true);
        (0, globals_1.expect)(third.allowed).toBe(false);
        (0, globals_1.expect)(third.reason).toBe('requests_per_minute_exceeded');
    });
    (0, globals_1.it)('throttles lower-priority workloads under saturation', () => {
        quotaManager.setTenantOverrides('tenant-c', {
            requestsPerMinute: { limit: 5, windowMs: 60_000, burstCredits: 0 },
        });
        quotaManager.updateSaturationSnapshot({ queueDepth: 500 });
        const lowPriority = quotaManager.checkQuota('tenant-c', 'requests_per_minute', 1, {}, { priority: 'low' });
        const vipPriority = quotaManager.checkQuota('tenant-c', 'requests_per_minute', 1, {}, { priority: 'vip' });
        (0, globals_1.expect)(lowPriority.allowed).toBe(false);
        (0, globals_1.expect)(lowPriority.reason).toBe('saturation_throttle');
        (0, globals_1.expect)(vipPriority.allowed).toBe(true);
    });
});
