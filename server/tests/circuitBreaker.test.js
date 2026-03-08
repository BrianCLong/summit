"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const circuitBreaker_js_1 = require("../src/lib/circuitBreaker.js");
(0, globals_1.describe)('CircuitBreaker', () => {
    (0, globals_1.it)('should start closed', () => {
        const cb = new circuitBreaker_js_1.CircuitBreaker({ name: 'test', failureThreshold: 2, cooldownMs: 100 });
        (0, globals_1.expect)(cb.getState()).toBe('closed');
        (0, globals_1.expect)(cb.canExecute()).toBe(true);
    });
    (0, globals_1.it)('should open after threshold failures', () => {
        const cb = new circuitBreaker_js_1.CircuitBreaker({ name: 'test', failureThreshold: 2, cooldownMs: 100 });
        cb.recordFailure(new Error('fail 1'));
        (0, globals_1.expect)(cb.getState()).toBe('closed');
        cb.recordFailure(new Error('fail 2'));
        (0, globals_1.expect)(cb.getState()).toBe('open');
        (0, globals_1.expect)(cb.canExecute()).toBe(false);
    });
    (0, globals_1.it)('should transition to half-open after cooldown', async () => {
        const cb = new circuitBreaker_js_1.CircuitBreaker({ name: 'test', failureThreshold: 1, cooldownMs: 50 });
        cb.recordFailure(new Error('fail'));
        (0, globals_1.expect)(cb.getState()).toBe('open');
        await new Promise(resolve => setTimeout(resolve, 60));
        // State remains 'open' until checked or accessed if using lazy check,
        // but canExecute() triggers the check
        (0, globals_1.expect)(cb.canExecute()).toBe(true);
        // Internal state should be half-open now
        // But getState might return half-open if logic says so
        (0, globals_1.expect)(cb.getState()).toBe('half-open');
    });
    (0, globals_1.it)('should reset to closed on success', () => {
        const cb = new circuitBreaker_js_1.CircuitBreaker({ name: 'test', failureThreshold: 1, cooldownMs: 100 });
        cb.recordFailure(new Error('fail'));
        cb.recordSuccess(); // Should reset
        (0, globals_1.expect)(cb.getState()).toBe('closed');
        (0, globals_1.expect)(cb.canExecute()).toBe(true);
    });
});
