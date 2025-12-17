/**
 * Unit tests for Resilience Patterns
 */

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  RateLimiter,
  retryWithBackoff,
  ResilienceManager,
} from '../resilience.js';

describe('CircuitBreaker', () => {
  describe('closed state', () => {
    it('should execute function in closed state', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });

    it('should track failures', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      const failingFn = async () => {
        throw new Error('fail');
      };

      // First two failures - still closed
      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('closed');

      await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('closed');
    });

    it('should open after threshold failures', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      const failingFn = async () => {
        throw new Error('fail');
      };

      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(failingFn)).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('open');
    });

    it('should reset failure count on success', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount <= 2) throw new Error('fail');
        return 'success';
      };

      await expect(cb.execute(fn)).rejects.toThrow('fail');
      await expect(cb.execute(fn)).rejects.toThrow('fail');

      const result = await cb.execute(fn);
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('open state', () => {
    it('should reject immediately when open', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        resetTimeout: 10000,
      });

      // Trip the circuit
      await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      expect(cb.getState()).toBe('open');

      // Should reject without calling function
      await expect(cb.execute(async () => 'should not run')).rejects.toThrow(
        CircuitBreakerOpenError
      );
    });
  });

  describe('half-open state', () => {
    it('should transition to half-open after timeout', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        resetTimeout: 50, // 50ms for fast test
        halfOpenRequests: 2,
      });

      // Trip the circuit
      await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      expect(cb.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Next call should transition to half-open
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
      expect(cb.getState()).toBe('half-open');
    });

    it('should close after successful half-open requests', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenRequests: 2,
      });

      // Trip and wait
      await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Two successful calls should close circuit
      await cb.execute(async () => 'success1');
      expect(cb.getState()).toBe('half-open');

      await cb.execute(async () => 'success2');
      expect(cb.getState()).toBe('closed');
    });

    it('should re-open on failure in half-open state', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        resetTimeout: 50,
        halfOpenRequests: 2,
      });

      // Trip and wait
      await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First call succeeds (half-open)
      await cb.execute(async () => 'success');
      expect(cb.getState()).toBe('half-open');

      // Second call fails - should re-open
      await expect(cb.execute(async () => { throw new Error('fail again'); })).rejects.toThrow();
      expect(cb.getState()).toBe('open');
    });
  });

  describe('events', () => {
    it('should emit state change events', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        resetTimeout: 50,
      });

      const events: Array<{ from: string; to: string }> = [];
      cb.on('stateChange', (e) => events.push(e));

      // Trip circuit
      await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

      expect(events).toContainEqual(
        expect.objectContaining({ from: 'closed', to: 'open' })
      );
    });
  });

  describe('metrics', () => {
    it('should provide metrics', async () => {
      const cb = new CircuitBreaker('test-metrics', {
        failureThreshold: 3,
      });

      await cb.execute(async () => 'success');

      const metrics = cb.getMetrics();
      expect(metrics.name).toBe('test-metrics');
      expect(metrics.state).toBe('closed');
      expect(metrics.failures).toBe(0);
    });
  });

  describe('reset', () => {
    it('should allow manual reset', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        resetTimeout: 10000,
      });

      // Trip circuit
      await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
      expect(cb.getState()).toBe('open');

      // Manual reset
      cb.reset();
      expect(cb.getState()).toBe('closed');

      // Should work again
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });
  });
});

describe('RateLimiter', () => {
  describe('token acquisition', () => {
    it('should allow requests within limit', () => {
      const rl = new RateLimiter('test', {
        requestsPerMinute: 60,
        burstSize: 10,
      });

      // Should allow burst
      for (let i = 0; i < 10; i++) {
        expect(rl.tryAcquire()).toBe(true);
      }

      // Next should fail (burst exhausted)
      expect(rl.tryAcquire()).toBe(false);
    });

    it('should refill tokens over time', async () => {
      const rl = new RateLimiter('test', {
        requestsPerMinute: 6000, // 100/sec for fast test
        burstSize: 5,
      });

      // Exhaust tokens
      for (let i = 0; i < 5; i++) {
        rl.tryAcquire();
      }
      expect(rl.tryAcquire()).toBe(false);

      // Wait for refill
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have some tokens now
      expect(rl.getAvailableTokens()).toBeGreaterThan(0);
    });
  });

  describe('async acquire', () => {
    it('should wait for token when exhausted', async () => {
      const rl = new RateLimiter('test', {
        requestsPerMinute: 6000,
        burstSize: 1,
      });

      // Use the only token
      rl.tryAcquire();

      const start = Date.now();
      await rl.acquire();
      const elapsed = Date.now() - start;

      // Should have waited some time
      expect(elapsed).toBeGreaterThanOrEqual(5);
    });
  });

  describe('execute with rate limit', () => {
    it('should execute function with rate limiting', async () => {
      const rl = new RateLimiter('test', {
        requestsPerMinute: 600,
        burstSize: 5,
      });

      const results: string[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await rl.execute(async () => `result-${i}`);
        results.push(result);
      }

      expect(results).toEqual(['result-0', 'result-1', 'result-2']);
    });
  });

  describe('metrics', () => {
    it('should provide metrics', () => {
      const rl = new RateLimiter('test-metrics', {
        requestsPerMinute: 100,
        burstSize: 10,
      });

      const metrics = rl.getMetrics();
      expect(metrics.name).toBe('test-metrics');
      expect(metrics.maxTokens).toBe(10);
      expect(metrics.refillRate).toBe(100);
    });
  });
});

describe('retryWithBackoff', () => {
  it('should succeed on first try', async () => {
    const result = await retryWithBackoff(async () => 'success');
    expect(result).toBe('success');
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    await expect(
      retryWithBackoff(
        async () => {
          throw new Error('always fails');
        },
        { maxRetries: 2, baseDelayMs: 10 }
      )
    ).rejects.toThrow('always fails');
  });

  it('should respect shouldRetry predicate', async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts++;
          throw new Error('do not retry');
        },
        {
          maxRetries: 3,
          baseDelayMs: 10,
          shouldRetry: () => false,
        }
      )
    ).rejects.toThrow('do not retry');

    expect(attempts).toBe(1);
  });
});

describe('ResilienceManager', () => {
  it('should create and cache circuit breakers per partner', () => {
    const manager = new ResilienceManager();

    const cb1 = manager.getCircuitBreaker('partner-a');
    const cb2 = manager.getCircuitBreaker('partner-a');
    const cb3 = manager.getCircuitBreaker('partner-b');

    expect(cb1).toBe(cb2); // Same instance
    expect(cb1).not.toBe(cb3); // Different instance
  });

  it('should create and cache rate limiters per partner', () => {
    const manager = new ResilienceManager();

    const rl1 = manager.getRateLimiter('partner-a');
    const rl2 = manager.getRateLimiter('partner-a');

    expect(rl1).toBe(rl2);
  });

  it('should execute with full resilience', async () => {
    const manager = new ResilienceManager();

    const result = await manager.executeWithResilience('partner-test', async () => 'success');
    expect(result).toBe('success');
  });

  it('should not retry circuit breaker open errors', async () => {
    const manager = new ResilienceManager();
    const cb = manager.getCircuitBreaker('failing-partner');

    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
    }

    expect(cb.getState()).toBe('open');

    // executeWithResilience should fail immediately
    await expect(
      manager.executeWithResilience('failing-partner', async () => 'should not run')
    ).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('should provide aggregated metrics', async () => {
    const manager = new ResilienceManager();

    // Create some resources
    manager.getCircuitBreaker('partner-1');
    manager.getCircuitBreaker('partner-2');
    manager.getRateLimiter('partner-1');

    const metrics = manager.getMetrics();

    expect(metrics.circuitBreakers['partner-1']).toBeDefined();
    expect(metrics.circuitBreakers['partner-2']).toBeDefined();
    expect(metrics.rateLimiters['partner-1']).toBeDefined();
  });

  it('should reset all circuit breakers', async () => {
    const manager = new ResilienceManager();

    // Trip some circuits
    const cb = manager.getCircuitBreaker('reset-test');
    for (let i = 0; i < 5; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {
        // Expected
      }
    }
    expect(cb.getState()).toBe('open');

    // Reset all
    manager.resetAll();
    expect(cb.getState()).toBe('closed');
  });
});
