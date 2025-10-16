const { EventEmitter } = require('events');
const logger = require('../utils/logger');

/**
 * Production-grade Circuit Breaker implementation for Maestro Conductor
 * Provides automatic failure detection, recovery, and health monitoring
 */
class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration with production-ready defaults
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 60 seconds
    this.monitoringWindow = options.monitoringWindow || 300000; // 5 minutes
    this.slowRequestThreshold = options.slowRequestThreshold || 5000; // 5 seconds
    this.expectedErrors = options.expectedErrors || [];
    this.volumeThreshold = options.volumeThreshold || 10; // Minimum requests before circuit can trip

    // State management
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = [];
    this.requests = [];
    this.lastFailureTime = null;
    this.nextAttempt = 0;
    this.slowRequests = 0;

    // Metrics for monitoring
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      slowRequests: 0,
      circuitOpenTime: 0,
      lastResetTime: Date.now(),
    };

    // Cleanup old entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute

    logger.info(`Circuit breaker '${this.name}' initialized`, {
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout,
      monitoringWindow: this.monitoringWindow,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {...any} args - Arguments to pass to function
   * @returns {Promise} Result of function execution
   */
  async execute(fn, ...args) {
    const requestStart = Date.now();
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
        error.code = 'CIRCUIT_OPEN';
        this.emit('open', { name: this.name, error });
        throw error;
      }

      // Try to move to half-open state
      this.state = 'HALF_OPEN';
      this.emit('halfOpen', { name: this.name });
      logger.info(`Circuit breaker '${this.name}' moved to HALF_OPEN state`);
    }

    try {
      const result = await this.executeWithTimeout(fn, args, requestStart);
      this.onSuccess(requestStart);
      return result;
    } catch (error) {
      this.onFailure(error, requestStart);
      throw error;
    }
  }

  /**
   * Execute function with timeout protection
   */
  async executeWithTimeout(fn, args, requestStart) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.metrics.timeoutRequests++;
        const error = new Error(
          `Request timeout in circuit breaker '${this.name}'`,
        );
        error.code = 'TIMEOUT';
        reject(error);
      }, this.slowRequestThreshold);

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

  /**
   * Handle successful request
   */
  onSuccess(requestStart) {
    const duration = Date.now() - requestStart;
    this.metrics.successfulRequests++;
    this.requests.push({ timestamp: Date.now(), success: true, duration });

    // Track slow requests even if successful
    if (duration > this.slowRequestThreshold) {
      this.slowRequests++;
      this.metrics.slowRequests++;
      this.emit('slowRequest', { name: this.name, duration });
    }

    // Reset circuit if in half-open state
    if (this.state === 'HALF_OPEN') {
      this.reset();
    }

    this.emit('success', { name: this.name, duration });
  }

  /**
   * Handle failed request
   */
  onFailure(error, requestStart) {
    const duration = Date.now() - requestStart;
    this.metrics.failedRequests++;

    // Don't count expected errors as failures
    if (this.isExpectedError(error)) {
      this.emit('expectedError', { name: this.name, error });
      return;
    }

    this.failures.push({ timestamp: Date.now(), error: error.message });
    this.requests.push({ timestamp: Date.now(), success: false, duration });
    this.lastFailureTime = Date.now();

    // Check if circuit should trip
    if (this.shouldTrip()) {
      this.trip();
    }

    this.emit('failure', { name: this.name, error, duration });
  }

  /**
   * Determine if circuit should trip based on failure rate and volume
   */
  shouldTrip() {
    if (this.state === 'OPEN') return false;

    const now = Date.now();
    const windowStart = now - this.monitoringWindow;

    // Get recent requests within monitoring window
    const recentRequests = this.requests.filter(
      (req) => req.timestamp > windowStart,
    );
    const recentFailures = this.failures.filter(
      (failure) => failure.timestamp > windowStart,
    );

    // Need minimum volume before considering circuit trip
    if (recentRequests.length < this.volumeThreshold) {
      return false;
    }

    // Calculate failure rate
    const failureRate = recentFailures.length / recentRequests.length;
    const failureThresholdRate = this.failureThreshold / 100; // Convert percentage to decimal

    // Trip if failure rate exceeds threshold or too many consecutive failures
    const consecutiveFailures = this.getConsecutiveFailures();

    return (
      failureRate >= failureThresholdRate ||
      consecutiveFailures >= this.failureThreshold ||
      recentFailures.length >= this.failureThreshold
    );
  }

  /**
   * Get number of consecutive failures
   */
  getConsecutiveFailures() {
    let consecutive = 0;
    for (let i = this.requests.length - 1; i >= 0; i--) {
      if (!this.requests[i].success) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  /**
   * Trip the circuit breaker
   */
  trip() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.recoveryTimeout;
    this.metrics.circuitOpenTime = Date.now();

    this.emit('trip', {
      name: this.name,
      failureCount: this.failures.length,
      nextAttempt: this.nextAttempt,
    });

    logger.warn(`Circuit breaker '${this.name}' tripped`, {
      failureCount: this.failures.length,
      nextAttemptIn: this.recoveryTimeout,
    });
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = [];
    this.requests = [];
    this.slowRequests = 0;
    this.lastFailureTime = null;
    this.nextAttempt = 0;
    this.metrics.lastResetTime = Date.now();

    this.emit('reset', { name: this.name });
    logger.info(`Circuit breaker '${this.name}' reset to CLOSED state`);
  }

  /**
   * Force circuit open for testing/maintenance
   */
  forceOpen() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.recoveryTimeout;
    this.emit('forceOpen', { name: this.name });
    logger.warn(`Circuit breaker '${this.name}' forced OPEN`);
  }

  /**
   * Check if error is expected and shouldn't count as failure
   */
  isExpectedError(error) {
    return this.expectedErrors.some((expectedError) => {
      if (typeof expectedError === 'string') {
        return error.message.includes(expectedError);
      }
      if (expectedError instanceof RegExp) {
        return expectedError.test(error.message);
      }
      if (typeof expectedError === 'function') {
        return expectedError(error);
      }
      return false;
    });
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.monitoringWindow * 2; // Keep 2x monitoring window

    this.failures = this.failures.filter(
      (failure) => failure.timestamp > cutoff,
    );
    this.requests = this.requests.filter(
      (request) => request.timestamp > cutoff,
    );
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    const now = Date.now();
    const windowStart = now - this.monitoringWindow;
    const recentRequests = this.requests.filter(
      (req) => req.timestamp > windowStart,
    );
    const recentFailures = this.failures.filter(
      (failure) => failure.timestamp > windowStart,
    );

    return {
      name: this.name,
      state: this.state,
      failures: this.failures.length,
      recentFailures: recentFailures.length,
      recentRequests: recentRequests.length,
      failureRate:
        recentRequests.length > 0
          ? recentFailures.length / recentRequests.length
          : 0,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      metrics: { ...this.metrics },
      uptime: this.state === 'CLOSED' ? now - this.metrics.lastResetTime : 0,
    };
  }

  /**
   * Get health metrics for monitoring
   */
  getHealthMetrics() {
    const status = this.getStatus();
    return {
      circuit_breaker_state: status.state === 'CLOSED' ? 1 : 0,
      circuit_breaker_failures_total: status.metrics.failedRequests,
      circuit_breaker_requests_total: status.metrics.totalRequests,
      circuit_breaker_success_rate:
        status.metrics.totalRequests > 0
          ? status.metrics.successfulRequests / status.metrics.totalRequests
          : 1,
      circuit_breaker_slow_requests_total: status.metrics.slowRequests,
      circuit_breaker_open_time_seconds:
        status.state === 'OPEN'
          ? (Date.now() - status.metrics.circuitOpenTime) / 1000
          : 0,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }
}

module.exports = CircuitBreaker;
