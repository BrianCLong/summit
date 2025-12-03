/**
 * Circuit Breaker Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerRegistry } from '../src/routing/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-provider', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      monitoringWindow: 5000,
    });
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
    });

    it('should allow execution in closed state', () => {
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('failure handling', () => {
    it('should track failures', () => {
      breaker.recordFailure(new Error('test error'));
      expect(breaker.getState().failures).toBe(1);
    });

    it('should open circuit after threshold failures', () => {
      breaker.recordFailure(new Error('error 1'));
      breaker.recordFailure(new Error('error 2'));
      breaker.recordFailure(new Error('error 3'));

      const state = breaker.getState();
      expect(state.state).toBe('open');
      expect(breaker.canExecute()).toBe(false);
    });

    it('should emit circuit:opened event', () => {
      const handler = vi.fn();
      breaker.on('circuit:opened', handler);

      breaker.recordFailure(new Error('error 1'));
      breaker.recordFailure(new Error('error 2'));
      breaker.recordFailure(new Error('error 3'));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'test-provider',
          failures: 3,
        }),
      );
    });
  });

  describe('success handling', () => {
    it('should reset failure count on success', () => {
      breaker.recordFailure(new Error('error'));
      breaker.recordSuccess();

      expect(breaker.getState().failures).toBe(0);
    });

    it('should track successes in half-open state', () => {
      // Open the circuit
      breaker.recordFailure(new Error('error 1'));
      breaker.recordFailure(new Error('error 2'));
      breaker.recordFailure(new Error('error 3'));

      // Force to half-open
      breaker.forceState('half-open');

      breaker.recordSuccess();
      expect(breaker.getState().successes).toBe(1);
    });

    it('should close circuit after success threshold in half-open', () => {
      breaker.forceState('half-open');

      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState().state).toBe('closed');
    });
  });

  describe('half-open state', () => {
    it('should transition from open to half-open after timeout', async () => {
      // Open the circuit
      breaker.recordFailure(new Error('error 1'));
      breaker.recordFailure(new Error('error 2'));
      breaker.recordFailure(new Error('error 3'));

      expect(breaker.canExecute()).toBe(false);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');
    });

    it('should reopen on failure in half-open state', () => {
      breaker.forceState('half-open');
      breaker.recordFailure(new Error('error'));

      expect(breaker.getState().state).toBe('open');
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      breaker.recordFailure(new Error('error 1'));
      breaker.recordFailure(new Error('error 2'));
      breaker.recordFailure(new Error('error 3'));

      breaker.reset();

      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  it('should create breakers on demand', () => {
    const breaker = registry.getOrCreate('provider-1');
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should return same breaker for same provider', () => {
    const breaker1 = registry.getOrCreate('provider-1');
    const breaker2 = registry.getOrCreate('provider-1');

    expect(breaker1).toBe(breaker2);
  });

  it('should return different breakers for different providers', () => {
    const breaker1 = registry.getOrCreate('provider-1');
    const breaker2 = registry.getOrCreate('provider-2');

    expect(breaker1).not.toBe(breaker2);
  });

  it('should return available providers', () => {
    registry.getOrCreate('provider-1');
    registry.getOrCreate('provider-2');

    const available = registry.getAvailable();
    expect(available).toContain('provider-1');
    expect(available).toContain('provider-2');
  });

  it('should exclude providers with open circuits', () => {
    const breaker1 = registry.getOrCreate('provider-1');
    registry.getOrCreate('provider-2');

    // Open provider-1's circuit
    breaker1.forceState('open');

    const available = registry.getAvailable();
    expect(available).not.toContain('provider-1');
    expect(available).toContain('provider-2');
  });

  it('should reset all breakers', () => {
    const breaker1 = registry.getOrCreate('provider-1');
    const breaker2 = registry.getOrCreate('provider-2');

    breaker1.forceState('open');
    breaker2.forceState('open');

    registry.resetAll();

    expect(breaker1.getState().state).toBe('closed');
    expect(breaker2.getState().state).toBe('closed');
  });
});
