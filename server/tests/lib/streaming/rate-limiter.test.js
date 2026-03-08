"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rate_limiter_1 = require("../../../src/lib/streaming/rate-limiter");
(0, globals_1.describe)('AdaptiveRateLimiter', () => {
    let now = 0;
    let nowSpy;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.useFakeTimers();
        now = 0;
        nowSpy = globals_1.jest.spyOn(Date, 'now').mockImplementation(() => now);
    });
    (0, globals_1.afterEach)(() => {
        nowSpy.mockRestore();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('should allow acquiring tokens when available', async () => {
        const limiter = new rate_limiter_1.AdaptiveRateLimiter({ initialTokens: 10 });
        try {
            await limiter.acquire(); // Should resolve immediately
        }
        finally {
            limiter.destroy();
        }
    });
    (0, globals_1.it)('should block when no tokens are available', async () => {
        const limiter = new rate_limiter_1.AdaptiveRateLimiter({ initialTokens: 1, refillRate: 1 });
        try {
            await limiter.acquire(); // Uses the only token
            let acquired = false;
            const acquirePromise = limiter.acquire().then(() => {
                acquired = true;
            });
            (0, globals_1.expect)(acquired).toBe(false);
            // Advance time to refill tokens and process the queue
            now += 1000;
            globals_1.jest.advanceTimersByTime(1000); // 1 second
            await acquirePromise;
            (0, globals_1.expect)(acquired).toBe(true);
        }
        finally {
            limiter.destroy();
        }
    });
    (0, globals_1.it)('should handle client-scoped limits', async () => {
        const limiter = new rate_limiter_1.AdaptiveRateLimiter({ clientScope: true, initialTokens: 1, refillRate: 1 });
        try {
            await limiter.acquire('client1'); // Uses the only token for client1
            let client1Acquired = false;
            const client1Promise = limiter.acquire('client1').then(() => {
                client1Acquired = true;
            });
            // client2 should be able to acquire a token immediately
            await limiter.acquire('client2');
            (0, globals_1.expect)(client1Acquired).toBe(false);
            now += 1000;
            globals_1.jest.advanceTimersByTime(1000);
            await client1Promise;
            (0, globals_1.expect)(client1Acquired).toBe(true);
        }
        finally {
            limiter.destroy();
        }
    });
});
