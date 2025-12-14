import { logger } from '../config/logger.js';
import { EventEmitter } from 'events';

// --- Interfaces ---

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  retryableErrors?: (string | RegExp)[];
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number; // ms to wait before half-open
  monitoringWindow?: number; // ms to track failures
  expectedErrors?: string[]; // Errors that trip the breaker
}

export interface BulkheadOptions {
  maxConcurrent: number;
  queueSize: number;
  timeoutMs: number;
}

export interface ExecutionOptions {
  timeout?: number;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions;
  bulkhead?: BulkheadOptions;
  // Feature flags
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
  enableBulkhead?: boolean;
  enableTimeout?: boolean;
}

// --- Components ---

/**
 * Timeout Wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Retry Policy
 */
export class RetryPolicy {
  private options: Required<RetryOptions>;

  constructor(options: RetryOptions) {
    this.options = {
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      ...options,
    };
  }

  async execute<T>(fn: () => Promise<T>, operationName: string = 'operation'): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        if (attempt < this.options.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          logger.warn(
            `Retry attempt ${attempt}/${this.options.maxAttempts} for '${operationName}' in ${delay}ms. Error: ${error.message}`
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.options.maxAttempts) return false;
    // Don't retry 4xx (except maybe 429, but typically handled by rate limiters)
    if (error.status && error.status >= 400 && error.status < 500) return false;

    return this.options.retryableErrors.some((pattern) => {
      if (typeof pattern === 'string') {
        return error.code === pattern || error.message?.includes(pattern);
      }
      return pattern.test(error.message || '');
    });
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1),
      this.options.maxDelay
    );
    const jitter = exponentialDelay * this.options.jitterFactor * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }
}

/**
 * Circuit Breaker
 */
export class CircuitBreaker extends EventEmitter {
  public state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(public name: string, options: CircuitBreakerOptions) {
    super();
    this.options = {
      monitoringWindow: 60000,
      expectedErrors: [],
      ...options,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.transition('HALF_OPEN');
      } else {
        throw new Error(`CircuitBreaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.transition('CLOSED');
      }
      return result;
    } catch (error: any) {
      if (this.isFailure(error)) {
        this.recordFailure();
      }
      throw error;
    }
  }

  private isFailure(error: any): boolean {
    // If expected error (e.g. business logic error), don't trip
    if (this.options.expectedErrors.includes(error.code) ||
        this.options.expectedErrors.some(msg => error.message?.includes(msg))) {
      return false;
    }
    return true;
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold) {
      this.transition('OPEN');
    } else if (this.state === 'HALF_OPEN') {
      this.transition('OPEN');
    }
  }

  private transition(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN') {
    this.state = newState;
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.emit('reset');
    } else if (newState === 'OPEN') {
      this.emit('trip');
    } else if (newState === 'HALF_OPEN') {
      this.emit('halfOpen');
    }
  }
}

/**
 * Bulkhead
 */
export class Bulkhead {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(public name: string, private options: BulkheadOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.options.maxConcurrent) {
      if (this.queue.length >= this.options.queueSize) {
        throw new Error(`Bulkhead '${this.name}' queue full`);
      }
      await new Promise<void>((resolve, reject) => {
        // Enqueue with timeout
        const timer = setTimeout(() => {
           // Remove from queue
           const idx = this.queue.indexOf(next);
           if (idx > -1) this.queue.splice(idx, 1);
           reject(new Error(`Bulkhead '${this.name}' queue timeout`));
        }, this.options.timeoutMs);

        const next = () => {
          clearTimeout(timer);
          resolve();
        };
        this.queue.push(next);
      });
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

/**
 * Resilience Manager Singleton
 */
class ResilienceManager {
  private breakers = new Map<string, CircuitBreaker>();
  private bulkheads = new Map<string, Bulkhead>();
  private retries = new Map<string, RetryPolicy>();

  getCircuitBreaker(name: string, options: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  getBulkhead(name: string, options: BulkheadOptions): Bulkhead {
    if (!this.bulkheads.has(name)) {
      this.bulkheads.set(name, new Bulkhead(name, options));
    }
    return this.bulkheads.get(name)!;
  }

  getRetryPolicy(name: string, options: RetryOptions): RetryPolicy {
    if (!this.retries.has(name)) {
      this.retries.set(name, new RetryPolicy(options));
    }
    return this.retries.get(name)!;
  }

  async execute<T>(name: string, fn: () => Promise<T>, options: ExecutionOptions): Promise<T> {
    let wrapped = fn;

    // 1. Timeout (innermost)
    if (options.enableTimeout !== false && options.timeout) {
       const original = wrapped;
       wrapped = () => withTimeout(original, options.timeout!, name);
    }

    // 2. Circuit Breaker
    if (options.enableCircuitBreaker !== false && options.circuitBreaker) {
      const cb = this.getCircuitBreaker(name, options.circuitBreaker);
      const original = wrapped;
      wrapped = () => cb.execute(original);
    }

    // 3. Bulkhead
    if (options.enableBulkhead !== false && options.bulkhead) {
      const bh = this.getBulkhead(name, options.bulkhead);
      const original = wrapped;
      wrapped = () => bh.execute(original);
    }

    // 4. Retry (outermost)
    if (options.enableRetry !== false && options.retry) {
      const policy = this.getRetryPolicy(name, options.retry);
      const original = wrapped;
      wrapped = () => policy.execute(original, name);
    }

    return wrapped();
  }
}

export const resilience = new ResilienceManager();
