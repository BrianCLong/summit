"use strict";
/**
 * Unit tests for Resilience Patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const resilience_js_1 = require("../resilience.js");
(0, globals_1.describe)('CircuitBreaker', () => {
    (0, globals_1.describe)('closed state', () => {
        (0, globals_1.it)('should execute function in closed state', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            const result = await cb.execute(async () => 'success');
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(cb.getState()).toBe('closed');
        });
        (0, globals_1.it)('should track failures', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            const failingFn = async () => {
                throw new Error('fail');
            };
            // First two failures - still closed
            await (0, globals_1.expect)(cb.execute(failingFn)).rejects.toThrow('fail');
            (0, globals_1.expect)(cb.getState()).toBe('closed');
            await (0, globals_1.expect)(cb.execute(failingFn)).rejects.toThrow('fail');
            (0, globals_1.expect)(cb.getState()).toBe('closed');
        });
        (0, globals_1.it)('should open after threshold failures', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            const failingFn = async () => {
                throw new Error('fail');
            };
            for (let i = 0; i < 3; i++) {
                await (0, globals_1.expect)(cb.execute(failingFn)).rejects.toThrow('fail');
            }
            (0, globals_1.expect)(cb.getState()).toBe('open');
        });
        (0, globals_1.it)('should reset failure count on success', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 3,
                resetTimeout: 1000,
            });
            let callCount = 0;
            const fn = async () => {
                callCount++;
                if (callCount <= 2)
                    throw new Error('fail');
                return 'success';
            };
            await (0, globals_1.expect)(cb.execute(fn)).rejects.toThrow('fail');
            await (0, globals_1.expect)(cb.execute(fn)).rejects.toThrow('fail');
            const result = await cb.execute(fn);
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(cb.getState()).toBe('closed');
        });
    });
    (0, globals_1.describe)('open state', () => {
        (0, globals_1.it)('should reject immediately when open', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 1,
                resetTimeout: 10000,
            });
            // Trip the circuit
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            (0, globals_1.expect)(cb.getState()).toBe('open');
            // Should reject without calling function
            await (0, globals_1.expect)(cb.execute(async () => 'should not run')).rejects.toThrow(resilience_js_1.CircuitBreakerOpenError);
        });
    });
    (0, globals_1.describe)('half-open state', () => {
        (0, globals_1.it)('should transition to half-open after timeout', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 1,
                resetTimeout: 50, // 50ms for fast test
                halfOpenRequests: 2,
            });
            // Trip the circuit
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            (0, globals_1.expect)(cb.getState()).toBe('open');
            // Wait for reset timeout
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Next call should transition to half-open
            const result = await cb.execute(async () => 'success');
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(cb.getState()).toBe('half-open');
        });
        (0, globals_1.it)('should close after successful half-open requests', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 1,
                resetTimeout: 50,
                halfOpenRequests: 2,
            });
            // Trip and wait
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Two successful calls should close circuit
            await cb.execute(async () => 'success1');
            (0, globals_1.expect)(cb.getState()).toBe('half-open');
            await cb.execute(async () => 'success2');
            (0, globals_1.expect)(cb.getState()).toBe('closed');
        });
        (0, globals_1.it)('should re-open on failure in half-open state', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 1,
                resetTimeout: 50,
                halfOpenRequests: 2,
            });
            // Trip and wait
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            await new Promise((resolve) => setTimeout(resolve, 100));
            // First call succeeds (half-open)
            await cb.execute(async () => 'success');
            (0, globals_1.expect)(cb.getState()).toBe('half-open');
            // Second call fails - should re-open
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail again'); })).rejects.toThrow();
            (0, globals_1.expect)(cb.getState()).toBe('open');
        });
    });
    (0, globals_1.describe)('events', () => {
        (0, globals_1.it)('should emit state change events', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 1,
                resetTimeout: 50,
            });
            const events = [];
            cb.on('stateChange', (e) => events.push(e));
            // Trip circuit
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            (0, globals_1.expect)(events).toContainEqual(globals_1.expect.objectContaining({ from: 'closed', to: 'open' }));
        });
    });
    (0, globals_1.describe)('metrics', () => {
        (0, globals_1.it)('should provide metrics', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test-metrics', {
                failureThreshold: 3,
            });
            await cb.execute(async () => 'success');
            const metrics = cb.getMetrics();
            (0, globals_1.expect)(metrics.name).toBe('test-metrics');
            (0, globals_1.expect)(metrics.state).toBe('closed');
            (0, globals_1.expect)(metrics.failures).toBe(0);
        });
    });
    (0, globals_1.describe)('reset', () => {
        (0, globals_1.it)('should allow manual reset', async () => {
            const cb = new resilience_js_1.CircuitBreaker('test', {
                failureThreshold: 1,
                resetTimeout: 10000,
            });
            // Trip circuit
            await (0, globals_1.expect)(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            (0, globals_1.expect)(cb.getState()).toBe('open');
            // Manual reset
            cb.reset();
            (0, globals_1.expect)(cb.getState()).toBe('closed');
            // Should work again
            const result = await cb.execute(async () => 'success');
            (0, globals_1.expect)(result).toBe('success');
        });
    });
});
(0, globals_1.describe)('RateLimiter', () => {
    (0, globals_1.describe)('token acquisition', () => {
        (0, globals_1.it)('should allow requests within limit', () => {
            const rl = new resilience_js_1.RateLimiter('test', {
                requestsPerMinute: 60,
                burstSize: 10,
            });
            // Should allow burst
            for (let i = 0; i < 10; i++) {
                (0, globals_1.expect)(rl.tryAcquire()).toBe(true);
            }
            // Next should fail (burst exhausted)
            (0, globals_1.expect)(rl.tryAcquire()).toBe(false);
        });
        (0, globals_1.it)('should refill tokens over time', async () => {
            const rl = new resilience_js_1.RateLimiter('test', {
                requestsPerMinute: 6000, // 100/sec for fast test
                burstSize: 5,
            });
            // Exhaust tokens
            for (let i = 0; i < 5; i++) {
                rl.tryAcquire();
            }
            (0, globals_1.expect)(rl.tryAcquire()).toBe(false);
            // Wait for refill
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Should have some tokens now
            (0, globals_1.expect)(rl.getAvailableTokens()).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('async acquire', () => {
        (0, globals_1.it)('should wait for token when exhausted', async () => {
            const rl = new resilience_js_1.RateLimiter('test', {
                requestsPerMinute: 6000,
                burstSize: 1,
            });
            // Use the only token
            rl.tryAcquire();
            const start = Date.now();
            await rl.acquire();
            const elapsed = Date.now() - start;
            // Should have waited some time
            (0, globals_1.expect)(elapsed).toBeGreaterThanOrEqual(5);
        });
    });
    (0, globals_1.describe)('execute with rate limit', () => {
        (0, globals_1.it)('should execute function with rate limiting', async () => {
            const rl = new resilience_js_1.RateLimiter('test', {
                requestsPerMinute: 600,
                burstSize: 5,
            });
            const results = [];
            for (let i = 0; i < 3; i++) {
                const result = await rl.execute(async () => `result-${i}`);
                results.push(result);
            }
            (0, globals_1.expect)(results).toEqual(['result-0', 'result-1', 'result-2']);
        });
    });
    (0, globals_1.describe)('metrics', () => {
        (0, globals_1.it)('should provide metrics', () => {
            const rl = new resilience_js_1.RateLimiter('test-metrics', {
                requestsPerMinute: 100,
                burstSize: 10,
            });
            const metrics = rl.getMetrics();
            (0, globals_1.expect)(metrics.name).toBe('test-metrics');
            (0, globals_1.expect)(metrics.maxTokens).toBe(10);
            (0, globals_1.expect)(metrics.refillRate).toBe(100);
        });
    });
});
(0, globals_1.describe)('retryWithBackoff', () => {
    (0, globals_1.it)('should succeed on first try', async () => {
        const result = await (0, resilience_js_1.retryWithBackoff)(async () => 'success');
        (0, globals_1.expect)(result).toBe('success');
    });
    (0, globals_1.it)('should retry on failure', async () => {
        let attempts = 0;
        const result = await (0, resilience_js_1.retryWithBackoff)(async () => {
            attempts++;
            if (attempts < 3)
                throw new Error('fail');
            return 'success';
        }, { maxRetries: 3, baseDelayMs: 10 });
        (0, globals_1.expect)(result).toBe('success');
        (0, globals_1.expect)(attempts).toBe(3);
    });
    (0, globals_1.it)('should throw after max retries', async () => {
        await (0, globals_1.expect)((0, resilience_js_1.retryWithBackoff)(async () => {
            throw new Error('always fails');
        }, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('always fails');
    });
    (0, globals_1.it)('should respect shouldRetry predicate', async () => {
        let attempts = 0;
        await (0, globals_1.expect)((0, resilience_js_1.retryWithBackoff)(async () => {
            attempts++;
            throw new Error('do not retry');
        }, {
            maxRetries: 3,
            baseDelayMs: 10,
            shouldRetry: () => false,
        })).rejects.toThrow('do not retry');
        (0, globals_1.expect)(attempts).toBe(1);
    });
});
(0, globals_1.describe)('ResilienceManager', () => {
    (0, globals_1.it)('should create and cache circuit breakers per partner', () => {
        const manager = new resilience_js_1.ResilienceManager();
        const cb1 = manager.getCircuitBreaker('partner-a');
        const cb2 = manager.getCircuitBreaker('partner-a');
        const cb3 = manager.getCircuitBreaker('partner-b');
        (0, globals_1.expect)(cb1).toBe(cb2); // Same instance
        (0, globals_1.expect)(cb1).not.toBe(cb3); // Different instance
    });
    (0, globals_1.it)('should create and cache rate limiters per partner', () => {
        const manager = new resilience_js_1.ResilienceManager();
        const rl1 = manager.getRateLimiter('partner-a');
        const rl2 = manager.getRateLimiter('partner-a');
        (0, globals_1.expect)(rl1).toBe(rl2);
    });
    (0, globals_1.it)('should execute with full resilience', async () => {
        const manager = new resilience_js_1.ResilienceManager();
        const result = await manager.executeWithResilience('partner-test', async () => 'success');
        (0, globals_1.expect)(result).toBe('success');
    });
    (0, globals_1.it)('should not retry circuit breaker open errors', async () => {
        const manager = new resilience_js_1.ResilienceManager();
        const cb = manager.getCircuitBreaker('failing-partner');
        // Trip the circuit
        for (let i = 0; i < 5; i++) {
            try {
                await cb.execute(async () => {
                    throw new Error('fail');
                });
            }
            catch {
                // Expected
            }
        }
        (0, globals_1.expect)(cb.getState()).toBe('open');
        // executeWithResilience should fail immediately
        await (0, globals_1.expect)(manager.executeWithResilience('failing-partner', async () => 'should not run')).rejects.toThrow(resilience_js_1.CircuitBreakerOpenError);
    });
    (0, globals_1.it)('should provide aggregated metrics', async () => {
        const manager = new resilience_js_1.ResilienceManager();
        // Create some resources
        manager.getCircuitBreaker('partner-1');
        manager.getCircuitBreaker('partner-2');
        manager.getRateLimiter('partner-1');
        const metrics = manager.getMetrics();
        (0, globals_1.expect)(metrics.circuitBreakers['partner-1']).toBeDefined();
        (0, globals_1.expect)(metrics.circuitBreakers['partner-2']).toBeDefined();
        (0, globals_1.expect)(metrics.rateLimiters['partner-1']).toBeDefined();
    });
    (0, globals_1.it)('should reset all circuit breakers', async () => {
        const manager = new resilience_js_1.ResilienceManager();
        // Trip some circuits
        const cb = manager.getCircuitBreaker('reset-test');
        for (let i = 0; i < 5; i++) {
            try {
                await cb.execute(async () => { throw new Error('fail'); });
            }
            catch {
                // Expected
            }
        }
        (0, globals_1.expect)(cb.getState()).toBe('open');
        // Reset all
        manager.resetAll();
        (0, globals_1.expect)(cb.getState()).toBe('closed');
    });
});
