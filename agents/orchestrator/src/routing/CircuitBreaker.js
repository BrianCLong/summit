"use strict";
/**
 * Circuit Breaker Implementation
 *
 * Implements the circuit breaker pattern for resilient LLM provider
 * failover with configurable thresholds and recovery strategies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerRegistry = exports.CircuitBreaker = void 0;
const eventemitter3_1 = require("eventemitter3");
class CircuitBreaker extends eventemitter3_1.EventEmitter {
    state = 'closed';
    failures = 0;
    successes = 0;
    lastFailure;
    lastSuccess;
    nextAttempt;
    config;
    providerId;
    constructor(providerId, config = {}) {
        super();
        this.providerId = providerId;
        this.config = {
            failureThreshold: config.failureThreshold ?? 5,
            successThreshold: config.successThreshold ?? 3,
            timeout: config.timeout ?? 30000, // 30 seconds
            monitoringWindow: config.monitoringWindow ?? 60000, // 1 minute
        };
    }
    /**
     * Check if the circuit allows the request
     */
    canExecute() {
        this.checkWindowExpiry();
        switch (this.state) {
            case 'closed':
                return true;
            case 'open':
                if (this.nextAttempt && new Date() >= this.nextAttempt) {
                    this.transitionTo('half-open');
                    return true;
                }
                return false;
            case 'half-open':
                return true;
            default:
                return false;
        }
    }
    /**
     * Record a successful execution
     */
    recordSuccess() {
        this.lastSuccess = new Date();
        this.successes++;
        switch (this.state) {
            case 'half-open':
                if (this.successes >= this.config.successThreshold) {
                    this.transitionTo('closed');
                }
                break;
            case 'closed':
                // Reset failure count on success
                this.failures = 0;
                break;
        }
        this.emit('success', {
            providerId: this.providerId,
            state: this.state,
            successes: this.successes,
        });
    }
    /**
     * Record a failed execution
     */
    recordFailure(error) {
        this.lastFailure = new Date();
        this.failures++;
        switch (this.state) {
            case 'closed':
                if (this.failures >= this.config.failureThreshold) {
                    this.transitionTo('open');
                }
                break;
            case 'half-open':
                // Any failure in half-open state reopens the circuit
                this.transitionTo('open');
                break;
        }
        this.emit('failure', {
            providerId: this.providerId,
            state: this.state,
            failures: this.failures,
            error: error?.message,
        });
    }
    /**
     * Get current state
     */
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            nextAttempt: this.nextAttempt,
        };
    }
    /**
     * Force circuit to a specific state (for testing/admin)
     */
    forceState(state) {
        this.transitionTo(state);
    }
    /**
     * Reset the circuit breaker
     */
    reset() {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = undefined;
        this.lastSuccess = undefined;
        this.nextAttempt = undefined;
        this.emit('reset', { providerId: this.providerId });
    }
    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        switch (newState) {
            case 'open':
                this.nextAttempt = new Date(Date.now() + this.config.timeout);
                this.successes = 0;
                this.emit('circuit:opened', {
                    providerId: this.providerId,
                    failures: this.failures,
                    nextAttempt: this.nextAttempt,
                });
                break;
            case 'half-open':
                this.successes = 0;
                this.emit('circuit:half-open', {
                    providerId: this.providerId,
                });
                break;
            case 'closed':
                this.failures = 0;
                this.successes = 0;
                this.nextAttempt = undefined;
                this.emit('circuit:closed', {
                    providerId: this.providerId,
                });
                break;
        }
        this.emit('state-change', {
            providerId: this.providerId,
            oldState,
            newState,
        });
    }
    /**
     * Check if monitoring window has expired and reset if needed
     */
    checkWindowExpiry() {
        if (this.state === 'closed' && this.lastFailure) {
            const windowExpiry = new Date(this.lastFailure.getTime() + this.config.monitoringWindow);
            if (new Date() > windowExpiry) {
                this.failures = 0;
            }
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Circuit Breaker Registry - manages circuit breakers for all providers
 */
class CircuitBreakerRegistry {
    breakers = new Map();
    defaultConfig;
    constructor(defaultConfig = {}) {
        this.defaultConfig = {
            failureThreshold: defaultConfig.failureThreshold ?? 5,
            successThreshold: defaultConfig.successThreshold ?? 3,
            timeout: defaultConfig.timeout ?? 30000,
            monitoringWindow: defaultConfig.monitoringWindow ?? 60000,
        };
    }
    /**
     * Get or create a circuit breaker for a provider
     */
    getOrCreate(providerId, config) {
        if (!this.breakers.has(providerId)) {
            const breaker = new CircuitBreaker(providerId, {
                ...this.defaultConfig,
                ...config,
            });
            this.breakers.set(providerId, breaker);
        }
        return this.breakers.get(providerId);
    }
    /**
     * Get a circuit breaker
     */
    get(providerId) {
        return this.breakers.get(providerId);
    }
    /**
     * Get all available providers (closed or half-open circuits)
     */
    getAvailable() {
        return Array.from(this.breakers.entries())
            .filter(([_, breaker]) => breaker.canExecute())
            .map(([id, _]) => id);
    }
    /**
     * Get all circuit states
     */
    getAllStates() {
        const states = {};
        for (const [id, breaker] of this.breakers) {
            states[id] = breaker.getState();
        }
        return states;
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}
exports.CircuitBreakerRegistry = CircuitBreakerRegistry;
