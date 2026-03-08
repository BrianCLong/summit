"use strict";
/**
 * Tests for resilience patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const resilience_1 = require("../resilience");
const errors_1 = require("../errors");
(0, globals_1.describe)('Resilience Patterns', () => {
    (0, globals_1.beforeEach)(() => {
        // Reset all circuit breakers before each test
        (0, resilience_1.resetAllCircuitBreakers)();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Circuit Breaker', () => {
        (0, globals_1.it)('should pass through successful requests when closed', async () => {
            const fn = globals_1.jest.fn().mockResolvedValue('success');
            const result = await (0, resilience_1.executeWithCircuitBreaker)('test-service', fn);
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should open circuit after threshold failures', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Service error'));
            // Make failureThreshold (5) consecutive failures
            for (let i = 0; i < 5; i++) {
                try {
                    await (0, resilience_1.executeWithCircuitBreaker)('test-service', fn, { failureThreshold: 5, timeout: 1000, successThreshold: 2, monitoringPeriod: 60000 });
                }
                catch (error) {
                    // Expected
                }
            }
            // Next request should fail immediately with CircuitBreakerError
            await (0, globals_1.expect)((0, resilience_1.executeWithCircuitBreaker)('test-service', fn)).rejects.toThrow(errors_1.CircuitBreakerError);
            // Original function should not be called when circuit is open
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(5); // Only from previous attempts
        });
        (0, globals_1.it)('should transition to half-open after timeout', async () => {
            const fn = globals_1.jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockRejectedValueOnce(new Error('Fail'))
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce('success');
            const config = {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 100, // 100ms timeout
                monitoringPeriod: 60000,
            };
            // Open circuit
            for (let i = 0; i < 3; i++) {
                try {
                    await (0, resilience_1.executeWithCircuitBreaker)('test-service-2', fn, config);
                }
                catch (error) {
                    // Expected
                }
            }
            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 150));
            // Should allow request in half-open state
            const result = await (0, resilience_1.executeWithCircuitBreaker)('test-service-2', fn, config);
            (0, globals_1.expect)(result).toBe('success');
        });
        (0, globals_1.it)('should track metrics correctly', async () => {
            const fn = globals_1.jest.fn().mockResolvedValue('success');
            await (0, resilience_1.executeWithCircuitBreaker)('metrics-test', fn);
            await (0, resilience_1.executeWithCircuitBreaker)('metrics-test', fn);
            const metrics = (0, resilience_1.getCircuitBreakerMetrics)();
            (0, globals_1.expect)(metrics['metrics-test']).toEqual({
                state: 'closed',
                failureCount: 0,
                successCount: 0, // Only tracked in half-open state
            });
        });
    });
    (0, globals_1.describe)('Retry Logic', () => {
        (0, globals_1.it)('should retry on failure and succeed', async () => {
            const fn = globals_1.jest.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValueOnce('success');
            const result = await (0, resilience_1.executeWithRetry)(fn, resilience_1.RetryPolicies.quick);
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should respect maxRetries', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Always fails'));
            await (0, globals_1.expect)((0, resilience_1.executeWithRetry)(fn, { ...resilience_1.RetryPolicies.quick, maxRetries: 2 })).rejects.toThrow('Always fails');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
        (0, globals_1.it)('should apply exponential backoff', async () => {
            const fn = globals_1.jest.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValueOnce('success');
            const startTime = Date.now();
            await (0, resilience_1.executeWithRetry)(fn, {
                maxRetries: 2,
                initialDelay: 100,
                maxDelay: 1000,
                backoffMultiplier: 2,
            });
            const duration = Date.now() - startTime;
            // Should take at least 100ms (first retry) + 200ms (second retry) = 300ms
            (0, globals_1.expect)(duration).toBeGreaterThanOrEqual(250); // Allow some variance
        });
        (0, globals_1.it)('should not retry non-retryable errors', async () => {
            const error = new Error('Validation error');
            error.code = 'VALIDATION_FAILED';
            const fn = globals_1.jest.fn().mockRejectedValue(error);
            await (0, globals_1.expect)((0, resilience_1.executeWithRetry)(fn, {
                ...resilience_1.RetryPolicies.default,
                retryableErrors: ['OPERATION_TIMEOUT'], // Only retry timeouts
            })).rejects.toThrow('Validation error');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1); // No retries
        });
    });
    (0, globals_1.describe)('Timeout', () => {
        (0, globals_1.it)('should timeout slow operations', async () => {
            const slowFn = () => new Promise(resolve => setTimeout(resolve, 5000));
            await (0, globals_1.expect)((0, resilience_1.executeWithTimeout)(slowFn, 100, 'slowOperation')).rejects.toThrow(errors_1.TimeoutError);
        });
        (0, globals_1.it)('should not timeout fast operations', async () => {
            const fastFn = () => Promise.resolve('success');
            const result = await (0, resilience_1.executeWithTimeout)(fastFn, 1000, 'fastOperation');
            (0, globals_1.expect)(result).toBe('success');
        });
        (0, globals_1.it)('should include operation name in timeout error', async () => {
            const slowFn = () => new Promise(resolve => setTimeout(resolve, 5000));
            try {
                await (0, resilience_1.executeWithTimeout)(slowFn, 100, 'myOperation');
                fail('Should have thrown TimeoutError');
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(errors_1.TimeoutError);
                (0, globals_1.expect)(error.message).toContain('myOperation');
                (0, globals_1.expect)(error.message).toContain('100ms');
            }
        });
    });
    (0, globals_1.describe)('Graceful Degradation', () => {
        (0, globals_1.it)('should return fallback on error', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Service unavailable'));
            const result = await (0, resilience_1.withGracefulDegradation)(fn, 'fallback-value', { serviceName: 'test', operation: 'test' });
            (0, globals_1.expect)(result).toBe('fallback-value');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should return actual result on success', async () => {
            const fn = globals_1.jest.fn().mockResolvedValue('actual-value');
            const result = await (0, resilience_1.withGracefulDegradation)(fn, 'fallback-value', { serviceName: 'test', operation: 'test' });
            (0, globals_1.expect)(result).toBe('actual-value');
        });
        (0, globals_1.it)('should handle null fallback', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Error'));
            const result = await (0, resilience_1.executeOptional)(fn, {
                serviceName: 'test',
                operation: 'test',
            });
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('Combined Resilience', () => {
        (0, globals_1.it)('should apply all patterns successfully', async () => {
            const fn = globals_1.jest.fn().mockResolvedValue('success');
            const result = await (0, resilience_1.executeWithResilience)({
                serviceName: 'combined-test',
                operation: 'test',
                fn,
                retryPolicy: resilience_1.RetryPolicies.quick,
                timeoutMs: 1000,
                circuitBreakerConfig: {
                    failureThreshold: 5,
                    successThreshold: 2,
                    timeout: 10000,
                    monitoringPeriod: 60000,
                },
            });
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(1);
        });
        (0, globals_1.it)('should retry transient failures', async () => {
            const fn = globals_1.jest.fn()
                .mockRejectedValueOnce(new Error('Transient failure'))
                .mockResolvedValueOnce('success');
            const result = await (0, resilience_1.executeWithResilience)({
                serviceName: 'retry-test',
                operation: 'test',
                fn,
                retryPolicy: resilience_1.RetryPolicies.quick,
                timeoutMs: 5000,
            });
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should timeout and retry', async () => {
            let callCount = 0;
            const fn = globals_1.jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // First call times out
                    return new Promise(resolve => setTimeout(resolve, 5000));
                }
                // Second call succeeds quickly
                return Promise.resolve('success');
            });
            const result = await (0, resilience_1.executeWithResilience)({
                serviceName: 'timeout-retry-test',
                operation: 'test',
                fn,
                retryPolicy: resilience_1.RetryPolicies.quick,
                timeoutMs: 100,
            });
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(fn).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should open circuit after repeated failures', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Persistent failure'));
            const config = {
                serviceName: 'circuit-test',
                operation: 'test',
                fn,
                retryPolicy: { ...resilience_1.RetryPolicies.quick, maxRetries: 1 },
                timeoutMs: 1000,
                circuitBreakerConfig: {
                    failureThreshold: 2,
                    successThreshold: 2,
                    timeout: 10000,
                    monitoringPeriod: 60000,
                },
            };
            // Make multiple failed attempts
            for (let i = 0; i < 2; i++) {
                try {
                    await (0, resilience_1.executeWithResilience)(config);
                }
                catch (error) {
                    // Expected
                }
            }
            // Circuit should be open now
            await (0, globals_1.expect)((0, resilience_1.executeWithResilience)(config)).rejects.toThrow(errors_1.CircuitBreakerError);
        });
    });
    (0, globals_1.describe)('Health Status', () => {
        (0, globals_1.it)('should report healthy when all circuits closed', () => {
            const health = (0, resilience_1.getHealthStatus)();
            (0, globals_1.expect)(health.healthy).toBe(true);
        });
        (0, globals_1.it)('should report unhealthy when any circuit open', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Error'));
            // Open circuit
            for (let i = 0; i < 5; i++) {
                try {
                    await (0, resilience_1.executeWithCircuitBreaker)('health-test', fn, {
                        failureThreshold: 5,
                        successThreshold: 2,
                        timeout: 10000,
                        monitoringPeriod: 60000,
                    });
                }
                catch (error) {
                    // Expected
                }
            }
            const health = (0, resilience_1.getHealthStatus)();
            (0, globals_1.expect)(health.healthy).toBe(false);
            (0, globals_1.expect)(health.details.circuitBreakers['health-test'].state).toBe('open');
        });
    });
    (0, globals_1.describe)('Reset Circuit Breakers', () => {
        (0, globals_1.it)('should reset all circuit breakers', async () => {
            const fn = globals_1.jest.fn().mockRejectedValue(new Error('Error'));
            // Open circuit
            for (let i = 0; i < 5; i++) {
                try {
                    await (0, resilience_1.executeWithCircuitBreaker)('reset-test', fn, {
                        failureThreshold: 5,
                        successThreshold: 2,
                        timeout: 10000,
                        monitoringPeriod: 60000,
                    });
                }
                catch (error) {
                    // Expected
                }
            }
            // Circuit should be open
            let metrics = (0, resilience_1.getCircuitBreakerMetrics)();
            (0, globals_1.expect)(metrics['reset-test'].state).toBe('open');
            // Reset
            (0, resilience_1.resetAllCircuitBreakers)();
            // Circuit should be closed
            metrics = (0, resilience_1.getCircuitBreakerMetrics)();
            (0, globals_1.expect)(metrics['reset-test'].state).toBe('closed');
        });
    });
});
