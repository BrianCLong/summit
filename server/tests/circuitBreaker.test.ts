import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import { CircuitBreaker } from '../src/lib/circuitBreaker.js';

describe('CircuitBreaker', () => {
    it('should start closed', () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, cooldownMs: 100 });
        expect(cb.getState()).toBe('closed');
        expect(cb.canExecute()).toBe(true);
    });

    it('should open after threshold failures', () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, cooldownMs: 100 });
        cb.recordFailure(new Error('fail 1'));
        expect(cb.getState()).toBe('closed');
        cb.recordFailure(new Error('fail 2'));
        expect(cb.getState()).toBe('open');
        expect(cb.canExecute()).toBe(false);
    });

    it('should transition to half-open after cooldown', async () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, cooldownMs: 50 });
        cb.recordFailure(new Error('fail'));
        expect(cb.getState()).toBe('open');

        await new Promise(resolve => setTimeout(resolve, 60));

        // State remains 'open' until checked or accessed if using lazy check,
        // but canExecute() triggers the check
        expect(cb.canExecute()).toBe(true);
        // Internal state should be half-open now
        // But getState might return half-open if logic says so
        expect(cb.getState()).toBe('half-open');
    });

    it('should reset to closed on success', () => {
        const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, cooldownMs: 100 });
        cb.recordFailure(new Error('fail'));
        cb.recordSuccess(); // Should reset
        expect(cb.getState()).toBe('closed');
        expect(cb.canExecute()).toBe(true);
    });
});
