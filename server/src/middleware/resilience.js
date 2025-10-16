const CircuitBreaker = require('./circuitBreaker');
const logger = require('../utils/logger');
const { promisify } = require('util');

/**
 * Resilience patterns middleware for Maestro Conductor
 * Implements retry logic, bulkhead isolation, and timeout management
 */

class RetryPolicy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitterFactor = options.jitterFactor || 0.1;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ];
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, ...args) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          break;
        }

        if (attempt < this.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          logger.warn(
            `Retry attempt ${attempt}/${this.maxAttempts} in ${delay}ms`,
            {
              error: error.message,
              attempt,
            },
          );
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  shouldRetry(error, attempt) {
    if (attempt >= this.maxAttempts) return false;

    // Don't retry client errors (4xx)
    if (error.status && error.status >= 400 && error.status < 500) {
      return false;
    }

    // Check for retryable error codes
    return this.retryableErrors.some((retryableError) => {
      if (typeof retryableError === 'string') {
        return (
          error.code === retryableError ||
          error.message.includes(retryableError)
        );
      }
      if (retryableError instanceof RegExp) {
        return retryableError.test(error.message);
      }
      return false;
    });
  }

  calculateDelay(attempt) {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1),
      this.maxDelay,
    );

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.jitterFactor * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class BulkheadIsolation {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.maxConcurrent = options.maxConcurrent || 10;
    this.queueSize = options.queueSize || 100;
    this.timeoutMs = options.timeoutMs || 30000;

    this.activeRequests = 0;
    this.queue = [];
    this.metrics = {
      totalRequests: 0,
      completedRequests: 0,
      rejectedRequests: 0,
      queuedRequests: 0,
      timeoutRequests: 0,
    };
  }

  /**
   * Execute function with bulkhead isolation
   */
  async execute(fn, ...args) {
    this.metrics.totalRequests++;

    // Check if we can execute immediately
    if (this.activeRequests < this.maxConcurrent) {
      return this.executeNow(fn, ...args);
    }

    // Check if queue is full
    if (this.queue.length >= this.queueSize) {
      this.metrics.rejectedRequests++;
      const error = new Error(`Bulkhead '${this.name}' queue is full`);
      error.code = 'BULKHEAD_QUEUE_FULL';
      throw error;
    }

    // Add to queue
    return this.addToQueue(fn, ...args);
  }

  async executeNow(fn, ...args) {
    this.activeRequests++;
    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(fn, args);
      this.metrics.completedRequests++;
      return result;
    } finally {
      this.activeRequests--;
      this.processQueue();

      logger.debug(`Bulkhead '${this.name}' execution completed`, {
        activeRequests: this.activeRequests,
        queueLength: this.queue.length,
        duration: Date.now() - startTime,
      });
    }
  }

  async executeWithTimeout(fn, args) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.metrics.timeoutRequests++;
        reject(new Error(`Bulkhead '${this.name}' execution timeout`));
      }, this.timeoutMs);

      try {
        const result = await fn(...args);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  addToQueue(fn, ...args) {
    this.metrics.queuedRequests++;

    return new Promise((resolve, reject) => {
      const queueItem = {
        fn,
        args,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(queueItem);

      // Set timeout for queued item
      setTimeout(() => {
        const index = this.queue.indexOf(queueItem);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.metrics.timeoutRequests++;
          reject(new Error(`Bulkhead '${this.name}' queue timeout`));
        }
      }, this.timeoutMs);
    });
  }

  processQueue() {
    if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const queueItem = this.queue.shift();
    if (queueItem) {
      // Execute queued item
      this.executeNow(queueItem.fn, ...queueItem.args)
        .then(queueItem.resolve)
        .catch(queueItem.reject);
    }
  }

  getStatus() {
    return {
      name: this.name,
      activeRequests: this.activeRequests,
      queueLength: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      queueSize: this.queueSize,
      metrics: { ...this.metrics },
    };
  }
}

class TimeoutManager {
  constructor(defaultTimeout = 5000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Execute function with timeout
   */
  async execute(fn, timeout = this.defaultTimeout, ...args) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await fn(...args);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}

class ResilienceManager {
  constructor() {
    this.circuitBreakers = new Map();
    this.bulkheads = new Map();
    this.retryPolicies = new Map();
    this.timeoutManager = new TimeoutManager();

    // Default configurations
    this.defaultCircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringWindow: 300000,
    };

    this.defaultRetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
    };

    this.defaultBulkheadConfig = {
      maxConcurrent: 10,
      queueSize: 100,
      timeoutMs: 30000,
    };
  }

  /**
   * Get or create circuit breaker
   */
  getCircuitBreaker(name, config = {}) {
    if (!this.circuitBreakers.has(name)) {
      const circuitBreaker = new CircuitBreaker({
        name,
        ...this.defaultCircuitBreakerConfig,
        ...config,
      });
      this.circuitBreakers.set(name, circuitBreaker);
    }
    return this.circuitBreakers.get(name);
  }

  /**
   * Get or create bulkhead
   */
  getBulkhead(name, config = {}) {
    if (!this.bulkheads.has(name)) {
      const bulkhead = new BulkheadIsolation({
        name,
        ...this.defaultBulkheadConfig,
        ...config,
      });
      this.bulkheads.set(name, bulkhead);
    }
    return this.bulkheads.get(name);
  }

  /**
   * Get or create retry policy
   */
  getRetryPolicy(name, config = {}) {
    if (!this.retryPolicies.has(name)) {
      const retryPolicy = new RetryPolicy({
        ...this.defaultRetryConfig,
        ...config,
      });
      this.retryPolicies.set(name, retryPolicy);
    }
    return this.retryPolicies.get(name);
  }

  /**
   * Execute with full resilience stack
   */
  async executeWithResilience(name, fn, options = {}) {
    const {
      circuitBreaker: cbConfig,
      retry: retryConfig,
      bulkhead: bulkheadConfig,
      timeout = 30000,
      enableCircuitBreaker = true,
      enableRetry = true,
      enableBulkhead = true,
      enableTimeout = true,
    } = options;

    let wrappedFn = fn;

    // Apply timeout if enabled
    if (enableTimeout) {
      const originalFn = wrappedFn;
      wrappedFn = async (...args) => {
        return this.timeoutManager.execute(originalFn, timeout, ...args);
      };
    }

    // Apply retry if enabled
    if (enableRetry) {
      const retryPolicy = this.getRetryPolicy(`${name}-retry`, retryConfig);
      const originalFn = wrappedFn;
      wrappedFn = async (...args) => {
        return retryPolicy.execute(originalFn, ...args);
      };
    }

    // Apply bulkhead if enabled
    if (enableBulkhead) {
      const bulkhead = this.getBulkhead(`${name}-bulkhead`, bulkheadConfig);
      const originalFn = wrappedFn;
      wrappedFn = async (...args) => {
        return bulkhead.execute(originalFn, ...args);
      };
    }

    // Apply circuit breaker if enabled
    if (enableCircuitBreaker) {
      const circuitBreaker = this.getCircuitBreaker(`${name}-cb`, cbConfig);
      const originalFn = wrappedFn;
      wrappedFn = async (...args) => {
        return circuitBreaker.execute(originalFn, ...args);
      };
    }

    return wrappedFn();
  }

  /**
   * Get health status of all resilience components
   */
  getHealthStatus() {
    const status = {
      circuitBreakers: {},
      bulkheads: {},
      timestamp: Date.now(),
    };

    // Circuit breaker status
    for (const [name, cb] of this.circuitBreakers) {
      status.circuitBreakers[name] = cb.getStatus();
    }

    // Bulkhead status
    for (const [name, bulkhead] of this.bulkheads) {
      status.bulkheads[name] = bulkhead.getStatus();
    }

    return status;
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    const metrics = {};

    // Circuit breaker metrics
    for (const [name, cb] of this.circuitBreakers) {
      const cbMetrics = cb.getHealthMetrics();
      for (const [key, value] of Object.entries(cbMetrics)) {
        metrics[`${key}_${name}`] = value;
      }
    }

    // Bulkhead metrics
    for (const [name, bulkhead] of this.bulkheads) {
      const status = bulkhead.getStatus();
      metrics[`bulkhead_active_requests_${name}`] = status.activeRequests;
      metrics[`bulkhead_queue_length_${name}`] = status.queueLength;
      metrics[`bulkhead_total_requests_${name}`] = status.metrics.totalRequests;
      metrics[`bulkhead_completed_requests_${name}`] =
        status.metrics.completedRequests;
      metrics[`bulkhead_rejected_requests_${name}`] =
        status.metrics.rejectedRequests;
    }

    return metrics;
  }

  /**
   * Cleanup all resources
   */
  destroy() {
    for (const cb of this.circuitBreakers.values()) {
      cb.destroy();
    }
    this.circuitBreakers.clear();
    this.bulkheads.clear();
    this.retryPolicies.clear();
  }
}

// Export singleton instance
const resilienceManager = new ResilienceManager();

module.exports = {
  CircuitBreaker,
  RetryPolicy,
  BulkheadIsolation,
  TimeoutManager,
  ResilienceManager,
  resilienceManager,
};
