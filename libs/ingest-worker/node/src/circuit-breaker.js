"use strict";
/**
 * Circuit Breaker Implementation
 *
 * Protects downstream services from cascade failures by tracking
 * failures and temporarily blocking requests when a threshold is exceeded.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Failures exceeded threshold, requests are blocked
 * - HALF_OPEN: Testing if service recovered
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerFactory = exports.TimeoutError = exports.CircuitBreakerError = exports.CircuitBreaker = void 0;
const events_1 = require("events");
class CircuitBreaker extends events_1.EventEmitter {
    config;
    state = 'closed';
    failures = [];
    consecutiveSuccesses = 0;
    lastFailureTime = null;
    lastSuccessTime = null;
    totalCalls = 0;
    totalFailures = 0;
    totalSuccesses = 0;
    totalTimeouts = 0;
    totalRejected = 0;
    halfOpenCalls = 0;
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Execute a function with circuit breaker protection.
     */
    async execute(fn) {
        // Check if circuit allows the call
        if (!this.canExecute()) {
            this.totalRejected++;
            throw new CircuitBreakerError('Circuit breaker is open', this.state);
        }
        this.totalCalls++;
        // Track half-open calls
        if (this.state === 'half-open') {
            this.halfOpenCalls++;
        }
        try {
            // Execute with optional timeout
            const result = this.config.callTimeoutMs
                ? await this.executeWithTimeout(fn, this.config.callTimeoutMs)
                : await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    /**
     * Check if circuit allows execution.
     */
    canExecute() {
        switch (this.state) {
            case 'closed':
                return true;
            case 'open':
                // Check if recovery time has passed
                if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.config.recoveryTimeMs) {
                    this.transitionTo('half-open');
                    return true;
                }
                return false;
            case 'half-open':
                // Allow limited calls in half-open state
                return this.halfOpenCalls < this.config.successThreshold;
            default:
                return false;
        }
    }
    /**
     * Manually trip the circuit (force open).
     */
    trip() {
        this.transitionTo('open');
        this.lastFailureTime = Date.now();
    }
    /**
     * Manually reset the circuit (force closed).
     */
    reset() {
        this.transitionTo('closed');
        this.failures = [];
        this.consecutiveSuccesses = 0;
        this.halfOpenCalls = 0;
    }
    /**
     * Get current circuit state.
     */
    getState() {
        // Check for automatic transition from open to half-open
        if (this.state === 'open' && this.lastFailureTime) {
            if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeMs) {
                this.transitionTo('half-open');
            }
        }
        return this.state;
    }
    /**
     * Get circuit statistics.
     */
    getStats() {
        // Clean up old failures
        this.cleanupFailures();
        return {
            state: this.getState(),
            failures: this.failures.length,
            successes: this.consecutiveSuccesses,
            consecutiveSuccesses: this.consecutiveSuccesses,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
            totalTimeouts: this.totalTimeouts,
            totalRejected: this.totalRejected,
        };
    }
    /**
     * Check if an error should be counted as a failure.
     * Can be overridden to customize failure detection.
     */
    isFailure(error) {
        // By default, all errors are failures
        // Override to exclude certain errors (e.g., validation errors)
        return true;
    }
    onSuccess() {
        this.totalSuccesses++;
        this.lastSuccessTime = Date.now();
        this.consecutiveSuccesses++;
        switch (this.state) {
            case 'half-open':
                // Check if we've had enough successes to close
                if (this.consecutiveSuccesses >= this.config.successThreshold) {
                    this.transitionTo('closed');
                    this.halfOpenCalls = 0;
                }
                break;
            case 'closed':
                // Success in closed state - nothing special
                break;
        }
    }
    onFailure(error) {
        if (!this.isFailure(error)) {
            return;
        }
        this.totalFailures++;
        this.lastFailureTime = Date.now();
        this.consecutiveSuccesses = 0;
        if (error instanceof TimeoutError) {
            this.totalTimeouts++;
        }
        switch (this.state) {
            case 'half-open':
                // Any failure in half-open immediately opens
                this.transitionTo('open');
                this.halfOpenCalls = 0;
                break;
            case 'closed':
                // Record failure and check threshold
                this.failures.push(Date.now());
                this.cleanupFailures();
                if (this.failures.length >= this.config.failureThreshold) {
                    this.transitionTo('open');
                }
                break;
        }
    }
    transitionTo(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.emit('stateChange', newState, oldState);
            if (newState === 'half-open') {
                this.halfOpenCalls = 0;
            }
        }
    }
    cleanupFailures() {
        const windowStart = Date.now() - this.config.windowSizeMs;
        this.failures = this.failures.filter((ts) => ts > windowStart);
    }
    async executeWithTimeout(fn, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new TimeoutError(`Circuit breaker call timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            fn()
                .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Error thrown when circuit breaker is open.
 */
class CircuitBreakerError extends Error {
    state;
    constructor(message, state) {
        super(message);
        this.state = state;
        this.name = 'CircuitBreakerError';
    }
}
exports.CircuitBreakerError = CircuitBreakerError;
/**
 * Error thrown when a call times out.
 */
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Factory for creating circuit breakers with shared configuration.
 */
class CircuitBreakerFactory {
    defaultConfig;
    breakers = new Map();
    constructor(defaultConfig) {
        this.defaultConfig = defaultConfig;
    }
    /**
     * Get or create a circuit breaker by name.
     */
    get(name, configOverrides) {
        let breaker = this.breakers.get(name);
        if (!breaker) {
            breaker = new CircuitBreaker({
                ...this.defaultConfig,
                ...configOverrides,
                name,
            });
            this.breakers.set(name, breaker);
        }
        return breaker;
    }
    /**
     * Get all circuit breakers.
     */
    getAll() {
        return new Map(this.breakers);
    }
    /**
     * Get stats for all circuit breakers.
     */
    getAllStats() {
        const stats = {};
        for (const [name, breaker] of this.breakers) {
            stats[name] = breaker.getStats();
        }
        return stats;
    }
    /**
     * Reset all circuit breakers.
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}
exports.CircuitBreakerFactory = CircuitBreakerFactory;
