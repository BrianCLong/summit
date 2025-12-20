/**
 * Resilience Patterns for Cross-Border Operations
 *
 * Circuit breaker, rate limiting, and retry logic for reliable
 * cross-border assistant communication.
 */

import { EventEmitter } from 'events';
import { getCrossBorderConfig } from './config.js';

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker for partner endpoints
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenRequests: number;

  constructor(
    private readonly name: string,
    options?: {
      failureThreshold?: number;
      resetTimeout?: number;
      halfOpenRequests?: number;
    }
  ) {
    super();
    const config = getCrossBorderConfig().circuitBreaker;
    this.failureThreshold = options?.failureThreshold ?? config.failureThreshold;
    this.resetTimeout = options?.resetTimeout ?? config.resetTimeoutMs;
    this.halfOpenRequests = options?.halfOpenRequests ?? config.halfOpenRequests;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.halfOpenRequests) {
        this.transitionTo('closed');
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failures >= this.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'closed') {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === 'half-open') {
      this.successes = 0;
    }

    this.emit('stateChange', { name: this.name, from: oldState, to: newState });
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('closed');
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is open`);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(
    private readonly name: string,
    options?: {
      requestsPerMinute?: number;
      burstSize?: number;
    }
  ) {
    const config = getCrossBorderConfig().rateLimit;
    this.maxTokens = options?.burstSize ?? config.burstSize;
    this.refillRate =
      (options?.requestsPerMinute ?? config.requestsPerMinute) / 60000;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
    }
  }

  /**
   * Execute with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      name: this.name,
      availableTokens: this.getAvailableTokens(),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate * 60000, // per minute
    };
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelayMs ?? 1000;
  const maxDelay = options?.maxDelayMs ?? 30000;
  const shouldRetry = options?.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Manager for circuit breakers and rate limiters per partner
 */
export class ResilienceManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  /**
   * Get or create circuit breaker for a partner
   */
  getCircuitBreaker(partnerId: string): CircuitBreaker {
    let cb = this.circuitBreakers.get(partnerId);
    if (!cb) {
      cb = new CircuitBreaker(partnerId);
      this.circuitBreakers.set(partnerId, cb);
    }
    return cb;
  }

  /**
   * Get or create rate limiter for a partner
   */
  getRateLimiter(partnerId: string): RateLimiter {
    let rl = this.rateLimiters.get(partnerId);
    if (!rl) {
      rl = new RateLimiter(partnerId);
      this.rateLimiters.set(partnerId, rl);
    }
    return rl;
  }

  /**
   * Execute with full resilience (rate limit + circuit breaker + retry)
   */
  async executeWithResilience<T>(
    partnerId: string,
    fn: () => Promise<T>,
    options?: { skipRateLimit?: boolean; skipCircuitBreaker?: boolean }
  ): Promise<T> {
    const rateLimiter = this.getRateLimiter(partnerId);
    const circuitBreaker = this.getCircuitBreaker(partnerId);

    const wrappedFn = async () => {
      if (!options?.skipRateLimit) {
        await rateLimiter.acquire();
      }

      if (!options?.skipCircuitBreaker) {
        return circuitBreaker.execute(fn);
      }

      return fn();
    };

    return retryWithBackoff(wrappedFn, {
      shouldRetry: (error) => {
        // Don't retry circuit breaker open errors
        if (error instanceof CircuitBreakerOpenError) {
          return false;
        }
        return true;
      },
    });
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const circuitBreakers: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};
    const rateLimiters: Record<string, ReturnType<RateLimiter['getMetrics']>> = {};

    for (const [id, cb] of this.circuitBreakers) {
      circuitBreakers[id] = cb.getMetrics();
    }

    for (const [id, rl] of this.rateLimiters) {
      rateLimiters[id] = rl.getMetrics();
    }

    return { circuitBreakers, rateLimiters };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const cb of this.circuitBreakers.values()) {
      cb.reset();
    }
  }
}

// Singleton
let resilienceManager: ResilienceManager | null = null;

export function getResilienceManager(): ResilienceManager {
  if (!resilienceManager) {
    resilienceManager = new ResilienceManager();
  }
  return resilienceManager;
}
