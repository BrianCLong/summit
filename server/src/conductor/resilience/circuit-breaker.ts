// Conductor Circuit Breaker & Bulkhead Pattern
// Implements fault tolerance with service isolation and cascading failure prevention

import { prometheusConductorMetrics } from '../observability/prometheus';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close circuit
  timeout: number; // Timeout in milliseconds
  resetTimeoutMs: number; // Time before attempting to close circuit
  monitoringWindowMs: number; // Rolling window for failure tracking
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private failures = 0;
  private successes = 0;
  private requests = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private nextAttemptTime = 0;
  private state: CircuitState = 'CLOSED';
  private failureTimes: number[] = [];

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      resetTimeoutMs: 60000,
      monitoringWindowMs: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.state === 'OPEN') {
        if (Date.now() < this.nextAttemptTime) {
          const error = new Error(`Circuit breaker OPEN for ${this.name}`);
          error.name = 'CircuitBreakerOpen';
          this.recordMetrics();
          reject(error);
          return;
        } else {
          this.state = 'HALF_OPEN';
          this.successes = 0;
        }
      }

      this.requests++;
      const timeoutId = setTimeout(() => {
        this.onFailure();
        const error = new Error(`Circuit breaker timeout for ${this.name}`);
        error.name = 'CircuitBreakerTimeout';
        reject(error);
      }, this.config.timeout);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          this.onSuccess();
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.onFailure();
          reject(error);
        });
    });
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Force circuit state change (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.state = state;
    if (state === 'CLOSED') {
      this.failures = 0;
      this.nextAttemptTime = 0;
    }
    this.recordMetrics();
  }

  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.failureTimes = [];
      }
    }

    this.recordMetrics();
  }

  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures++;
    this.failureTimes.push(now);

    // Clean old failures outside monitoring window
    this.failureTimes = this.failureTimes.filter(
      (time) => now - time < this.config.monitoringWindowMs,
    );

    // Check if should open circuit
    if (this.failureTimes.length >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = now + this.config.resetTimeoutMs;
    }

    this.recordMetrics();
  }

  private recordMetrics(): void {
    // Record Prometheus metrics
    prometheusConductorMetrics.recordSecurityEvent(
      `circuit_breaker_${this.state.toLowerCase()}`,
      true,
    );
  }
}

/**
 * Bulkhead Pattern Implementation
 * Isolates resources to prevent cascading failures
 */
export class BulkheadIsolator {
  private readonly pools = new Map<string, ResourcePool>();

  /**
   * Create or get resource pool for service
   */
  getPool(service: string, maxConcurrency: number = 10): ResourcePool {
    if (!this.pools.has(service)) {
      this.pools.set(service, new ResourcePool(service, maxConcurrency));
    }
    return this.pools.get(service)!;
  }

  /**
   * Execute function with bulkhead isolation
   */
  async executeInPool<T>(
    service: string,
    fn: () => Promise<T>,
    maxConcurrency?: number,
  ): Promise<T> {
    const pool = this.getPool(service, maxConcurrency);
    return pool.execute(fn);
  }

  /**
   * Get all pool statistics
   */
  getPoolStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [service, pool] of this.pools.entries()) {
      stats[service] = pool.getStats();
    }
    return stats;
  }
}

/**
 * Resource Pool for Bulkhead Pattern
 */
export class ResourcePool {
  private activeRequests = 0;
  private queuedRequests = 0;
  private maxConcurrency: number;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    private service: string,
    maxConcurrency: number,
  ) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Execute function with resource pool limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.activeRequests < this.maxConcurrency) {
        this.executeImmediate(fn, resolve, reject);
      } else {
        // Add to queue
        this.queue.push({ fn, resolve, reject });
        this.queuedRequests++;

        // Record queue metrics
        prometheusConductorMetrics.recordSecurityEvent(
          'bulkhead_queue_add',
          true,
        );
      }
    });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      service: this.service,
      activeRequests: this.activeRequests,
      queuedRequests: this.queuedRequests,
      maxConcurrency: this.maxConcurrency,
      utilizationPercent: (this.activeRequests / this.maxConcurrency) * 100,
    };
  }

  private async executeImmediate<T>(
    fn: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (error: any) => void,
  ): Promise<void> {
    this.activeRequests++;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrency) {
      const { fn, resolve, reject } = this.queue.shift()!;
      this.queuedRequests--;
      this.executeImmediate(fn, resolve, reject);
    }
  }
}

/**
 * Service Resilience Manager
 * Combines circuit breakers and bulkheads for comprehensive fault tolerance
 */
export class ServiceResilienceManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private bulkheadIsolator = new BulkheadIsolator();

  /**
   * Execute service call with full resilience protection
   */
  async executeResillient<T>(
    serviceName: string,
    operation: string,
    fn: () => Promise<T>,
    config?: {
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
      maxConcurrency?: number;
    },
  ): Promise<T> {
    const cbKey = `${serviceName}_${operation}`;

    // Get or create circuit breaker
    if (!this.circuitBreakers.has(cbKey)) {
      this.circuitBreakers.set(
        cbKey,
        new CircuitBreaker(cbKey, config?.circuitBreakerConfig),
      );
    }

    const circuitBreaker = this.circuitBreakers.get(cbKey)!;

    // Execute with both circuit breaker and bulkhead protection
    return circuitBreaker.execute(async () => {
      return this.bulkheadIsolator.executeInPool(
        serviceName,
        fn,
        config?.maxConcurrency,
      );
    });
  }

  /**
   * Get comprehensive resilience status
   */
  getResilienceStatus(): {
    circuitBreakers: Record<string, CircuitBreakerMetrics>;
    bulkheads: Record<string, any>;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const circuitBreakers: Record<string, CircuitBreakerMetrics> = {};
    let openCircuits = 0;
    let halfOpenCircuits = 0;

    for (const [name, cb] of this.circuitBreakers.entries()) {
      const metrics = cb.getMetrics();
      circuitBreakers[name] = metrics;

      if (metrics.state === 'OPEN') openCircuits++;
      if (metrics.state === 'HALF_OPEN') halfOpenCircuits++;
    }

    const bulkheads = this.bulkheadIsolator.getPoolStats();

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    if (openCircuits > 0) {
      overallHealth = 'critical';
    } else if (halfOpenCircuits > 0) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'healthy';
    }

    return {
      circuitBreakers,
      bulkheads,
      overallHealth,
    };
  }

  /**
   * Emergency circuit reset (admin operation)
   */
  resetAllCircuits(): void {
    for (const cb of this.circuitBreakers.values()) {
      cb.forceState('CLOSED');
    }
  }
}

// Singleton instances for conductor services
export const conductorResilienceManager = new ServiceResilienceManager();

// Service-specific resilience configurations
export const ResilienceConfigs = {
  MCP_GRAPHOPS: {
    circuitBreakerConfig: {
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      timeout: 10000,
    },
    maxConcurrency: 5,
  },
  MCP_FILES: {
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeoutMs: 15000,
      timeout: 5000,
    },
    maxConcurrency: 10,
  },
  LLM_HEAVY: {
    circuitBreakerConfig: {
      failureThreshold: 3,
      resetTimeoutMs: 60000,
      timeout: 45000,
    },
    maxConcurrency: 2,
  },
  LLM_LIGHT: {
    circuitBreakerConfig: {
      failureThreshold: 10,
      resetTimeoutMs: 30000,
      timeout: 15000,
    },
    maxConcurrency: 8,
  },
  DATABASE: {
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeoutMs: 120000,
      timeout: 30000,
    },
    maxConcurrency: 20,
  },
};

// Utility functions for conductor integration
export async function executeMCPCall<T>(
  server: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const config =
    server === 'graphops'
      ? ResilienceConfigs.MCP_GRAPHOPS
      : ResilienceConfigs.MCP_FILES;
  return conductorResilienceManager.executeResillient(
    `MCP_${server.toUpperCase()}`,
    operation,
    fn,
    config,
  );
}

export async function executeLLMCall<T>(
  model: 'heavy' | 'light',
  fn: () => Promise<T>,
): Promise<T> {
  const config =
    model === 'heavy'
      ? ResilienceConfigs.LLM_HEAVY
      : ResilienceConfigs.LLM_LIGHT;
  return conductorResilienceManager.executeResillient(
    `LLM_${model.toUpperCase()}`,
    'generate',
    fn,
    config,
  );
}

export async function executeDatabaseCall<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  return conductorResilienceManager.executeResillient(
    'DATABASE',
    operation,
    fn,
    ResilienceConfigs.DATABASE,
  );
}
