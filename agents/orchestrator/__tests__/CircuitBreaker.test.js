"use strict";
/**
 * Circuit Breaker Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CircuitBreaker_js_1 = require("../src/routing/CircuitBreaker.js");
(0, vitest_1.describe)('CircuitBreaker', () => {
    let breaker;
    (0, vitest_1.beforeEach)(() => {
        breaker = new CircuitBreaker_js_1.CircuitBreaker('test-provider', {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 1000,
            monitoringWindow: 5000,
        });
    });
    (0, vitest_1.describe)('initial state', () => {
        (0, vitest_1.it)('should start in closed state', () => {
            const state = breaker.getState();
            (0, vitest_1.expect)(state.state).toBe('closed');
            (0, vitest_1.expect)(state.failures).toBe(0);
            (0, vitest_1.expect)(state.successes).toBe(0);
        });
        (0, vitest_1.it)('should allow execution in closed state', () => {
            (0, vitest_1.expect)(breaker.canExecute()).toBe(true);
        });
    });
    (0, vitest_1.describe)('failure handling', () => {
        (0, vitest_1.it)('should track failures', () => {
            breaker.recordFailure(new Error('test error'));
            (0, vitest_1.expect)(breaker.getState().failures).toBe(1);
        });
        (0, vitest_1.it)('should open circuit after threshold failures', () => {
            breaker.recordFailure(new Error('error 1'));
            breaker.recordFailure(new Error('error 2'));
            breaker.recordFailure(new Error('error 3'));
            const state = breaker.getState();
            (0, vitest_1.expect)(state.state).toBe('open');
            (0, vitest_1.expect)(breaker.canExecute()).toBe(false);
        });
        (0, vitest_1.it)('should emit circuit:opened event', () => {
            const handler = vitest_1.vi.fn();
            breaker.on('circuit:opened', handler);
            breaker.recordFailure(new Error('error 1'));
            breaker.recordFailure(new Error('error 2'));
            breaker.recordFailure(new Error('error 3'));
            (0, vitest_1.expect)(handler).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(handler).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                providerId: 'test-provider',
                failures: 3,
            }));
        });
    });
    (0, vitest_1.describe)('success handling', () => {
        (0, vitest_1.it)('should reset failure count on success', () => {
            breaker.recordFailure(new Error('error'));
            breaker.recordSuccess();
            (0, vitest_1.expect)(breaker.getState().failures).toBe(0);
        });
        (0, vitest_1.it)('should track successes in half-open state', () => {
            // Open the circuit
            breaker.recordFailure(new Error('error 1'));
            breaker.recordFailure(new Error('error 2'));
            breaker.recordFailure(new Error('error 3'));
            // Force to half-open
            breaker.forceState('half-open');
            breaker.recordSuccess();
            (0, vitest_1.expect)(breaker.getState().successes).toBe(1);
        });
        (0, vitest_1.it)('should close circuit after success threshold in half-open', () => {
            breaker.forceState('half-open');
            breaker.recordSuccess();
            breaker.recordSuccess();
            (0, vitest_1.expect)(breaker.getState().state).toBe('closed');
        });
    });
    (0, vitest_1.describe)('half-open state', () => {
        (0, vitest_1.it)('should transition from open to half-open after timeout', async () => {
            // Open the circuit
            breaker.recordFailure(new Error('error 1'));
            breaker.recordFailure(new Error('error 2'));
            breaker.recordFailure(new Error('error 3'));
            (0, vitest_1.expect)(breaker.canExecute()).toBe(false);
            // Wait for timeout
            await new Promise((resolve) => setTimeout(resolve, 1100));
            (0, vitest_1.expect)(breaker.canExecute()).toBe(true);
            (0, vitest_1.expect)(breaker.getState().state).toBe('half-open');
        });
        (0, vitest_1.it)('should reopen on failure in half-open state', () => {
            breaker.forceState('half-open');
            breaker.recordFailure(new Error('error'));
            (0, vitest_1.expect)(breaker.getState().state).toBe('open');
        });
    });
    (0, vitest_1.describe)('reset', () => {
        (0, vitest_1.it)('should reset all state', () => {
            breaker.recordFailure(new Error('error 1'));
            breaker.recordFailure(new Error('error 2'));
            breaker.recordFailure(new Error('error 3'));
            breaker.reset();
            const state = breaker.getState();
            (0, vitest_1.expect)(state.state).toBe('closed');
            (0, vitest_1.expect)(state.failures).toBe(0);
            (0, vitest_1.expect)(state.successes).toBe(0);
        });
    });
});
(0, vitest_1.describe)('CircuitBreakerRegistry', () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new CircuitBreaker_js_1.CircuitBreakerRegistry();
    });
    (0, vitest_1.it)('should create breakers on demand', () => {
        const breaker = registry.getOrCreate('provider-1');
        (0, vitest_1.expect)(breaker).toBeInstanceOf(CircuitBreaker_js_1.CircuitBreaker);
    });
    (0, vitest_1.it)('should return same breaker for same provider', () => {
        const breaker1 = registry.getOrCreate('provider-1');
        const breaker2 = registry.getOrCreate('provider-1');
        (0, vitest_1.expect)(breaker1).toBe(breaker2);
    });
    (0, vitest_1.it)('should return different breakers for different providers', () => {
        const breaker1 = registry.getOrCreate('provider-1');
        const breaker2 = registry.getOrCreate('provider-2');
        (0, vitest_1.expect)(breaker1).not.toBe(breaker2);
    });
    (0, vitest_1.it)('should return available providers', () => {
        registry.getOrCreate('provider-1');
        registry.getOrCreate('provider-2');
        const available = registry.getAvailable();
        (0, vitest_1.expect)(available).toContain('provider-1');
        (0, vitest_1.expect)(available).toContain('provider-2');
    });
    (0, vitest_1.it)('should exclude providers with open circuits', () => {
        const breaker1 = registry.getOrCreate('provider-1');
        registry.getOrCreate('provider-2');
        // Open provider-1's circuit
        breaker1.forceState('open');
        const available = registry.getAvailable();
        (0, vitest_1.expect)(available).not.toContain('provider-1');
        (0, vitest_1.expect)(available).toContain('provider-2');
    });
    (0, vitest_1.it)('should reset all breakers', () => {
        const breaker1 = registry.getOrCreate('provider-1');
        const breaker2 = registry.getOrCreate('provider-2');
        breaker1.forceState('open');
        breaker2.forceState('open');
        registry.resetAll();
        (0, vitest_1.expect)(breaker1.getState().state).toBe('closed');
        (0, vitest_1.expect)(breaker2.getState().state).toBe('closed');
    });
});
