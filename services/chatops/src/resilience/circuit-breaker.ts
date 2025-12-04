/**
 * Circuit Breaker and Resilience Patterns
 *
 * Implements resilience patterns for ChatOps service:
 * - Circuit breaker (closed/open/half-open states)
 * - Retry with exponential backoff
 * - Bulkhead isolation
 * - Timeout management
 * - Fallback strategies
 * - Rate limiting
 *
 * Designed for:
 * - LLM API calls
 * - Database operations
 * - External service integrations
 * - Redis operations
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  monitorInterval?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  onFailure?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase?: number;
  jitter?: boolean;
  retryOn?: (error: Error) => boolean;
}

export interface BulkheadConfig {
  name: string;
  maxConcurrent: number;
  maxQueued: number;
  timeout?: number;
}

export interface RateLimiterConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
  strategy?: 'sliding' | 'fixed';
}

export interface TimeoutConfig {
  default: number;
  perOperation?: Record<string, number>;
}

export interface ResiliencePolicy {
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  bulkhead?: BulkheadConfig;
  rateLimiter?: RateLimiterConfig;
  timeout?: number;
  fallback?: <T>(error: Error) => T | Promise<T>;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private halfOpenAttempts = 0;
  private monitorInterval?: NodeJS.Timeout;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = {
      monitorInterval: 10000,
      ...config,
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitOpenError(this.config.name, this.getRemainingResetTime());
      }
    }

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new TimeoutError(this.config.name, this.config.timeout)),
        this.config.timeout
      );
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure?: Date;
  } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailure: this.lastFailureTime,
    };
  }

  /**
   * Manually reset the circuit
   */
  reset(): void {
    this.transitionTo('closed');
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
  }

  /**
   * Force the circuit open
   */
  trip(): void {
    this.transitionTo('open');
  }

  private onSuccess(): void {
    this.successCount++;
    this.config.onSuccess?.();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.successThreshold) {
        this.transitionTo('closed');
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
      }
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.config.onFailure?.(error);

    if (this.state === 'half-open') {
      this.transitionTo('open');
      this.halfOpenAttempts = 0;
    } else if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit('stateChange', { from: oldState, to: newState });
      this.config.onStateChange?.(oldState, newState);
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.config.resetTimeout;
  }

  private getRemainingResetTime(): number {
    if (!this.lastFailureTime) return 0;
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return Math.max(0, this.config.resetTimeout - elapsed);
  }

  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.emit('stats', this.getStats());
    }, this.config.monitorInterval);
  }

  destroy(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
}

// =============================================================================
// RETRY
// =============================================================================

export class RetryHandler {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = {
      exponentialBase: 2,
      jitter: true,
      retryOn: () => true,
      ...config,
    };
  }

  /**
   * Execute with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt >= this.config.maxAttempts) {
          break;
        }

        if (!this.config.retryOn!(lastError)) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw new RetryExhaustedError(
      `Retry exhausted after ${attempt} attempts`,
      lastError
    );
  }

  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelayMs * Math.pow(
      this.config.exponentialBase!,
      attempt - 1
    );

    delay = Math.min(delay, this.config.maxDelayMs);

    if (this.config.jitter) {
      // Add jitter: ±25%
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// BULKHEAD
// =============================================================================

export class Bulkhead {
  private config: BulkheadConfig;
  private activeCalls = 0;
  private queue: Array<{
    resolve: (value: void) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }> = [];

  constructor(config: BulkheadConfig) {
    this.config = config;
  }

  /**
   * Execute with bulkhead isolation
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Get current utilization
   */
  getStats(): {
    active: number;
    queued: number;
    available: number;
  } {
    return {
      active: this.activeCalls,
      queued: this.queue.length,
      available: this.config.maxConcurrent - this.activeCalls,
    };
  }

  private async acquire(): Promise<void> {
    if (this.activeCalls < this.config.maxConcurrent) {
      this.activeCalls++;
      return;
    }

    if (this.queue.length >= this.config.maxQueued) {
      throw new BulkheadFullError(this.config.name);
    }

    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, timeout: undefined as NodeJS.Timeout | undefined };

      if (this.config.timeout) {
        entry.timeout = setTimeout(() => {
          const index = this.queue.indexOf(entry);
          if (index >= 0) {
            this.queue.splice(index, 1);
            reject(new BulkheadTimeoutError(this.config.name));
          }
        }, this.config.timeout);
      }

      this.queue.push(entry);
    });
  }

  private release(): void {
    this.activeCalls--;

    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      if (next.timeout) {
        clearTimeout(next.timeout);
      }
      this.activeCalls++;
      next.resolve();
    }
  }
}

// =============================================================================
// RATE LIMITER
// =============================================================================

export class RateLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private requests: number[] = []; // For sliding window

  constructor(config: RateLimiterConfig) {
    this.config = {
      strategy: 'sliding',
      ...config,
    };
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Check if request is allowed
   */
  async tryAcquire(): Promise<boolean> {
    if (this.config.strategy === 'sliding') {
      return this.tryAcquireSlidingWindow();
    }
    return this.tryAcquireTokenBucket();
  }

  /**
   * Execute with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!await this.tryAcquire()) {
      throw new RateLimitExceededError(this.config.name, this.getRetryAfter());
    }
    return fn();
  }

  /**
   * Get time until next request allowed
   */
  getRetryAfter(): number {
    if (this.config.strategy === 'sliding') {
      if (this.requests.length < this.config.maxRequests) return 0;
      const oldest = this.requests[0];
      return Math.max(0, this.config.windowMs - (Date.now() - oldest));
    }

    if (this.tokens > 0) return 0;
    const elapsed = Date.now() - this.lastRefill;
    return Math.max(0, this.config.windowMs - elapsed);
  }

  private tryAcquireSlidingWindow(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests
    this.requests = this.requests.filter(t => t > windowStart);

    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  private tryAcquireTokenBucket(): boolean {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.windowMs) {
      this.tokens = this.config.maxRequests;
      this.lastRefill = now;
    }
  }
}

// =============================================================================
// RESILIENCE POLICY EXECUTOR
// =============================================================================

export class ResilienceExecutor {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private retryHandlers: Map<string, RetryHandler> = new Map();

  /**
   * Execute with a complete resilience policy
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    policy: ResiliencePolicy
  ): Promise<T> {
    // Setup components if not exists
    this.ensureComponents(name, policy);

    // Wrap function with all resilience patterns
    let wrappedFn = fn;

    // 1. Rate limiting (outermost)
    if (policy.rateLimiter) {
      const limiter = this.rateLimiters.get(name)!;
      const innerFn = wrappedFn;
      wrappedFn = () => limiter.execute(innerFn);
    }

    // 2. Bulkhead
    if (policy.bulkhead) {
      const bulkhead = this.bulkheads.get(name)!;
      const innerFn = wrappedFn;
      wrappedFn = () => bulkhead.execute(innerFn);
    }

    // 3. Circuit breaker
    if (policy.circuitBreaker) {
      const breaker = this.circuitBreakers.get(name)!;
      const innerFn = wrappedFn;
      wrappedFn = () => breaker.execute(innerFn);
    }

    // 4. Retry (innermost, around circuit breaker)
    if (policy.retry) {
      const retry = this.retryHandlers.get(name)!;
      const innerFn = wrappedFn;
      wrappedFn = () => retry.execute(innerFn);
    }

    // 5. Timeout
    if (policy.timeout) {
      const innerFn = wrappedFn;
      wrappedFn = () => this.withTimeout(innerFn, policy.timeout!);
    }

    // Execute with optional fallback
    try {
      return await wrappedFn();
    } catch (error) {
      if (policy.fallback) {
        return policy.fallback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Get statistics for all components
   */
  getStats(name: string): {
    circuitBreaker?: ReturnType<CircuitBreaker['getStats']>;
    bulkhead?: ReturnType<Bulkhead['getStats']>;
    rateLimiter?: { retryAfter: number };
  } {
    const stats: any = {};

    const cb = this.circuitBreakers.get(name);
    if (cb) stats.circuitBreaker = cb.getStats();

    const bh = this.bulkheads.get(name);
    if (bh) stats.bulkhead = bh.getStats();

    const rl = this.rateLimiters.get(name);
    if (rl) stats.rateLimiter = { retryAfter: rl.getRetryAfter() };

    return stats;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(name: string): void {
    this.circuitBreakers.get(name)?.reset();
  }

  private ensureComponents(name: string, policy: ResiliencePolicy): void {
    if (policy.circuitBreaker && !this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(policy.circuitBreaker));
    }

    if (policy.bulkhead && !this.bulkheads.has(name)) {
      this.bulkheads.set(name, new Bulkhead(policy.bulkhead));
    }

    if (policy.rateLimiter && !this.rateLimiters.has(name)) {
      this.rateLimiters.set(name, new RateLimiter(policy.rateLimiter));
    }

    if (policy.retry && !this.retryHandlers.has(name)) {
      this.retryHandlers.set(name, new RetryHandler(policy.retry));
    }
  }

  private async withTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError('operation', timeout)), timeout);
      }),
    ]);
  }

  destroy(): void {
    for (const cb of this.circuitBreakers.values()) {
      cb.destroy();
    }
  }
}

// =============================================================================
// PRESET POLICIES
// =============================================================================

export const PresetPolicies = {
  /**
   * Policy for LLM API calls
   */
  llmApi: (): ResiliencePolicy => ({
    circuitBreaker: {
      name: 'llm-api',
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000,
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      retryOn: (error) => {
        // Retry on rate limits and transient errors
        if (error.message.includes('429')) return true;
        if (error.message.includes('503')) return true;
        if (error.message.includes('timeout')) return true;
        return false;
      },
    },
    bulkhead: {
      name: 'llm-api',
      maxConcurrent: 10,
      maxQueued: 50,
      timeout: 60000,
    },
    rateLimiter: {
      name: 'llm-api',
      maxRequests: 100,
      windowMs: 60000,
    },
    timeout: 30000,
  }),

  /**
   * Policy for database operations
   */
  database: (): ResiliencePolicy => ({
    circuitBreaker: {
      name: 'database',
      failureThreshold: 3,
      successThreshold: 1,
      timeout: 5000,
      resetTimeout: 30000,
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 2000,
    },
    timeout: 5000,
  }),

  /**
   * Policy for Redis operations
   */
  redis: (): ResiliencePolicy => ({
    circuitBreaker: {
      name: 'redis',
      failureThreshold: 5,
      successThreshold: 1,
      timeout: 1000,
      resetTimeout: 10000,
    },
    retry: {
      maxAttempts: 2,
      baseDelayMs: 50,
      maxDelayMs: 500,
    },
    timeout: 1000,
  }),

  /**
   * Policy for external API calls
   */
  externalApi: (): ResiliencePolicy => ({
    circuitBreaker: {
      name: 'external-api',
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000,
      resetTimeout: 30000,
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
    },
    bulkhead: {
      name: 'external-api',
      maxConcurrent: 20,
      maxQueued: 100,
    },
    timeout: 10000,
  }),
};

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

export class CircuitOpenError extends Error {
  constructor(name: string, retryAfter: number) {
    super(`Circuit breaker '${name}' is open. Retry after ${retryAfter}ms`);
    this.name = 'CircuitOpenError';
  }
}

export class TimeoutError extends Error {
  constructor(name: string, timeout: number) {
    super(`Operation '${name}' timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class RetryExhaustedError extends Error {
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'RetryExhaustedError';
    this.cause = cause;
  }
}

export class BulkheadFullError extends Error {
  constructor(name: string) {
    super(`Bulkhead '${name}' is full`);
    this.name = 'BulkheadFullError';
  }
}

export class BulkheadTimeoutError extends Error {
  constructor(name: string) {
    super(`Bulkhead '${name}' queue timeout`);
    this.name = 'BulkheadTimeoutError';
  }
}

export class RateLimitExceededError extends Error {
  retryAfter: number;

  constructor(name: string, retryAfter: number) {
    super(`Rate limit exceeded for '${name}'. Retry after ${retryAfter}ms`);
    this.name = 'RateLimitExceededError';
    this.retryAfter = retryAfter;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createResilienceExecutor(): ResilienceExecutor {
  return new ResilienceExecutor();
}
