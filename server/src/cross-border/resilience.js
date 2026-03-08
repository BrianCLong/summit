"use strict";
/**
 * Resilience Patterns for Cross-Border Operations
 *
 * Circuit breaker, rate limiting, and retry logic for reliable
 * cross-border assistant communication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilienceManager = exports.RateLimiter = exports.CircuitBreakerOpenError = exports.CircuitBreaker = void 0;
exports.retryWithBackoff = retryWithBackoff;
exports.getResilienceManager = getResilienceManager;
const events_1 = require("events");
const config_js_1 = require("./config.js");
/**
 * Circuit breaker for partner endpoints
 */
class CircuitBreaker extends events_1.EventEmitter {
    name;
    state = 'closed';
    failures = 0;
    successes = 0;
    lastFailureTime = 0;
    failureThreshold;
    resetTimeout;
    halfOpenRequests;
    constructor(name, options) {
        super();
        this.name = name;
        const config = (0, config_js_1.getCrossBorderConfig)().circuitBreaker;
        this.failureThreshold = options?.failureThreshold ?? config.failureThreshold;
        this.resetTimeout = options?.resetTimeout ?? config.resetTimeoutMs;
        this.halfOpenRequests = options?.halfOpenRequests ?? config.halfOpenRequests;
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(fn) {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.transitionTo('half-open');
            }
            else {
                throw new CircuitBreakerOpenError(this.name);
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Record a successful call
     */
    onSuccess() {
        if (this.state === 'half-open') {
            this.successes++;
            if (this.successes >= this.halfOpenRequests) {
                this.transitionTo('closed');
            }
        }
        else {
            this.failures = 0;
        }
    }
    /**
     * Record a failed call
     */
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.state === 'half-open') {
            this.transitionTo('open');
        }
        else if (this.failures >= this.failureThreshold) {
            this.transitionTo('open');
        }
    }
    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        if (newState === 'closed') {
            this.failures = 0;
            this.successes = 0;
        }
        else if (newState === 'half-open') {
            this.successes = 0;
        }
        this.emit('stateChange', { name: this.name, from: oldState, to: newState });
    }
    /**
     * Get current state
     */
    getState() {
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
    reset() {
        this.transitionTo('closed');
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Error thrown when circuit is open
 */
class CircuitBreakerOpenError extends Error {
    constructor(name) {
        super(`Circuit breaker '${name}' is open`);
        this.name = 'CircuitBreakerOpenError';
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
/**
 * Token bucket rate limiter
 */
class RateLimiter {
    name;
    tokens;
    lastRefill;
    maxTokens;
    refillRate; // tokens per millisecond
    constructor(name, options) {
        this.name = name;
        const config = (0, config_js_1.getCrossBorderConfig)().rateLimit;
        this.maxTokens = options?.burstSize ?? config.burstSize;
        this.refillRate =
            (options?.requestsPerMinute ?? config.requestsPerMinute) / 60000;
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }
    /**
     * Try to acquire a token
     */
    tryAcquire() {
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
    async acquire() {
        while (!this.tryAcquire()) {
            const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
            await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
        }
    }
    /**
     * Execute with rate limiting
     */
    async execute(fn) {
        await this.acquire();
        return fn();
    }
    /**
     * Refill tokens based on elapsed time
     */
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const newTokens = elapsed * this.refillRate;
        this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
        this.lastRefill = now;
    }
    /**
     * Get current token count
     */
    getAvailableTokens() {
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
exports.RateLimiter = RateLimiter;
/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, options) {
    const maxRetries = options?.maxRetries ?? 3;
    const baseDelay = options?.baseDelayMs ?? 1000;
    const maxDelay = options?.maxDelayMs ?? 30000;
    const shouldRetry = options?.shouldRetry ?? (() => true);
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error;
            }
            const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
/**
 * Manager for circuit breakers and rate limiters per partner
 */
class ResilienceManager {
    circuitBreakers = new Map();
    rateLimiters = new Map();
    /**
     * Get or create circuit breaker for a partner
     */
    getCircuitBreaker(partnerId) {
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
    getRateLimiter(partnerId) {
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
    async executeWithResilience(partnerId, fn, options) {
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
        const circuitBreakers = {};
        const rateLimiters = {};
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
    resetAll() {
        for (const cb of this.circuitBreakers.values()) {
            cb.reset();
        }
    }
}
exports.ResilienceManager = ResilienceManager;
// Singleton
let resilienceManager = null;
function getResilienceManager() {
    if (!resilienceManager) {
        resilienceManager = new ResilienceManager();
    }
    return resilienceManager;
}
