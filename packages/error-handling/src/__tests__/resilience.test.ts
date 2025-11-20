/**
 * Tests for resilience patterns
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  executeWithCircuitBreaker,
  executeWithRetry,
  executeWithTimeout,
  executeWithResilience,
  withGracefulDegradation,
  executeOptional,
  getCircuitBreakerMetrics,
  getHealthStatus,
  resetAllCircuitBreakers,
  RetryPolicies,
} from '../resilience';
import {
  TimeoutError,
  CircuitBreakerError,
} from '../errors';

describe('Resilience Patterns', () => {
  beforeEach(() => {
    // Reset all circuit breakers before each test
    resetAllCircuitBreakers();
    jest.clearAllMocks();
  });

  describe('Circuit Breaker', () => {
    it('should pass through successful requests when closed', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await executeWithCircuitBreaker('test-service', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after threshold failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Make failureThreshold (5) consecutive failures
      for (let i = 0; i < 5; i++) {
        try {
          await executeWithCircuitBreaker(
            'test-service',
            fn,
            { failureThreshold: 5, timeout: 1000, successThreshold: 2, monitoringPeriod: 60000 }
          );
        } catch (error) {
          // Expected
        }
      }

      // Next request should fail immediately with CircuitBreakerError
      await expect(
        executeWithCircuitBreaker('test-service', fn)
      ).rejects.toThrow(CircuitBreakerError);

      // Original function should not be called when circuit is open
      expect(fn).toHaveBeenCalledTimes(5); // Only from previous attempts
    });

    it('should transition to half-open after timeout', async () => {
      const fn = jest.fn()
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
          await executeWithCircuitBreaker('test-service-2', fn, config);
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow request in half-open state
      const result = await executeWithCircuitBreaker('test-service-2', fn, config);
      expect(result).toBe('success');
    });

    it('should track metrics correctly', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      await executeWithCircuitBreaker('metrics-test', fn);
      await executeWithCircuitBreaker('metrics-test', fn);

      const metrics = getCircuitBreakerMetrics();

      expect(metrics['metrics-test']).toEqual({
        state: 'closed',
        failureCount: 0,
        successCount: 0, // Only tracked in half-open state
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure and succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const result = await executeWithRetry(fn, RetryPolicies.quick);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        executeWithRetry(fn, { ...RetryPolicies.quick, maxRetries: 2 })
      ).rejects.toThrow('Always fails');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should apply exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();

      await executeWithRetry(fn, {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      });

      const duration = Date.now() - startTime;

      // Should take at least 100ms (first retry) + 200ms (second retry) = 300ms
      expect(duration).toBeGreaterThanOrEqual(250); // Allow some variance
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Validation error');
      (error as any).code = 'VALIDATION_FAILED';

      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        executeWithRetry(fn, {
          ...RetryPolicies.default,
          retryableErrors: ['OPERATION_TIMEOUT'], // Only retry timeouts
        })
      ).rejects.toThrow('Validation error');

      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Timeout', () => {
    it('should timeout slow operations', async () => {
      const slowFn = () => new Promise(resolve => setTimeout(resolve, 5000));

      await expect(
        executeWithTimeout(slowFn, 100, 'slowOperation')
      ).rejects.toThrow(TimeoutError);
    });

    it('should not timeout fast operations', async () => {
      const fastFn = () => Promise.resolve('success');

      const result = await executeWithTimeout(fastFn, 1000, 'fastOperation');

      expect(result).toBe('success');
    });

    it('should include operation name in timeout error', async () => {
      const slowFn = () => new Promise(resolve => setTimeout(resolve, 5000));

      try {
        await executeWithTimeout(slowFn, 100, 'myOperation');
        fail('Should have thrown TimeoutError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect(error.message).toContain('myOperation');
        expect(error.message).toContain('100ms');
      }
    });
  });

  describe('Graceful Degradation', () => {
    it('should return fallback on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const result = await withGracefulDegradation(
        fn,
        'fallback-value',
        { serviceName: 'test', operation: 'test' }
      );

      expect(result).toBe('fallback-value');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return actual result on success', async () => {
      const fn = jest.fn().mockResolvedValue('actual-value');

      const result = await withGracefulDegradation(
        fn,
        'fallback-value',
        { serviceName: 'test', operation: 'test' }
      );

      expect(result).toBe('actual-value');
    });

    it('should handle null fallback', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Error'));

      const result = await executeOptional(fn, {
        serviceName: 'test',
        operation: 'test',
      });

      expect(result).toBeNull();
    });
  });

  describe('Combined Resilience', () => {
    it('should apply all patterns successfully', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await executeWithResilience({
        serviceName: 'combined-test',
        operation: 'test',
        fn,
        retryPolicy: RetryPolicies.quick,
        timeoutMs: 1000,
        circuitBreakerConfig: {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 10000,
          monitoringPeriod: 60000,
        },
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry transient failures', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Transient failure'))
        .mockResolvedValueOnce('success');

      const result = await executeWithResilience({
        serviceName: 'retry-test',
        operation: 'test',
        fn,
        retryPolicy: RetryPolicies.quick,
        timeoutMs: 5000,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should timeout and retry', async () => {
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call times out
          return new Promise(resolve => setTimeout(resolve, 5000));
        }
        // Second call succeeds quickly
        return Promise.resolve('success');
      });

      const result = await executeWithResilience({
        serviceName: 'timeout-retry-test',
        operation: 'test',
        fn,
        retryPolicy: RetryPolicies.quick,
        timeoutMs: 100,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should open circuit after repeated failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      const config = {
        serviceName: 'circuit-test',
        operation: 'test',
        fn,
        retryPolicy: { ...RetryPolicies.quick, maxRetries: 1 },
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
          await executeWithResilience(config);
        } catch (error) {
          // Expected
        }
      }

      // Circuit should be open now
      await expect(
        executeWithResilience(config)
      ).rejects.toThrow(CircuitBreakerError);
    });
  });

  describe('Health Status', () => {
    it('should report healthy when all circuits closed', () => {
      const health = getHealthStatus();

      expect(health.healthy).toBe(true);
    });

    it('should report unhealthy when any circuit open', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Error'));

      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await executeWithCircuitBreaker('health-test', fn, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 10000,
            monitoringPeriod: 60000,
          });
        } catch (error) {
          // Expected
        }
      }

      const health = getHealthStatus();

      expect(health.healthy).toBe(false);
      expect(health.details.circuitBreakers['health-test'].state).toBe('open');
    });
  });

  describe('Reset Circuit Breakers', () => {
    it('should reset all circuit breakers', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Error'));

      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await executeWithCircuitBreaker('reset-test', fn, {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 10000,
            monitoringPeriod: 60000,
          });
        } catch (error) {
          // Expected
        }
      }

      // Circuit should be open
      let metrics = getCircuitBreakerMetrics();
      expect(metrics['reset-test'].state).toBe('open');

      // Reset
      resetAllCircuitBreakers();

      // Circuit should be closed
      metrics = getCircuitBreakerMetrics();
      expect(metrics['reset-test'].state).toBe('closed');
    });
  });
});
