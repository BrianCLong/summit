"use strict";
// @ts-nocheck
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitExceededError = exports.BulkheadTimeoutError = exports.BulkheadFullError = exports.RetryExhaustedError = exports.TimeoutError = exports.CircuitOpenError = exports.PresetPolicies = exports.ResilienceExecutor = exports.RateLimiter = exports.Bulkhead = exports.RetryHandler = exports.CircuitBreaker = void 0;
exports.createResilienceExecutor = createResilienceExecutor;
const events_1 = require("events");
// =============================================================================
// CIRCUIT BREAKER
// =============================================================================
class CircuitBreaker extends events_1.EventEmitter {
    config;
    state = 'closed';
    failureCount = 0;
    successCount = 0;
    lastFailureTime;
    halfOpenAttempts = 0;
    monitorInterval;
    constructor(config) {
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
    async execute(fn) {
        // Check if circuit is open
        if (this.state === 'open') {
            if (this.shouldAttemptReset()) {
                this.transitionTo('half-open');
            }
            else {
                throw new CircuitOpenError(this.config.name, this.getRemainingResetTime());
            }
        }
        // Execute with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new TimeoutError(this.config.name, this.config.timeout)), this.config.timeout);
        });
        try {
            const result = await Promise.race([fn(), timeoutPromise]);
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    /**
     * Get current circuit state
     */
    getState() {
        return this.state;
    }
    /**
     * Get circuit statistics
     */
    getStats() {
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
    reset() {
        this.transitionTo('closed');
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0;
    }
    /**
     * Force the circuit open
     */
    trip() {
        this.transitionTo('open');
    }
    onSuccess() {
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
    onFailure(error) {
        this.failureCount++;
        this.lastFailureTime = new Date();
        this.config.onFailure?.(error);
        if (this.state === 'half-open') {
            this.transitionTo('open');
            this.halfOpenAttempts = 0;
        }
        else if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
            this.transitionTo('open');
        }
    }
    transitionTo(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.emit('stateChange', { from: oldState, to: newState });
            this.config.onStateChange?.(oldState, newState);
        }
    }
    shouldAttemptReset() {
        if (!this.lastFailureTime)
            return true;
        const elapsed = Date.now() - this.lastFailureTime.getTime();
        return elapsed >= this.config.resetTimeout;
    }
    getRemainingResetTime() {
        if (!this.lastFailureTime)
            return 0;
        const elapsed = Date.now() - this.lastFailureTime.getTime();
        return Math.max(0, this.config.resetTimeout - elapsed);
    }
    startMonitoring() {
        this.monitorInterval = setInterval(() => {
            this.emit('stats', this.getStats());
        }, this.config.monitorInterval);
    }
    destroy() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
// =============================================================================
// RETRY
// =============================================================================
class RetryHandler {
    config;
    constructor(config) {
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
    async execute(fn) {
        let lastError;
        let attempt = 0;
        while (attempt < this.config.maxAttempts) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                attempt++;
                if (attempt >= this.config.maxAttempts) {
                    break;
                }
                if (!this.config.retryOn(lastError)) {
                    break;
                }
                const delay = this.calculateDelay(attempt);
                await this.sleep(delay);
            }
        }
        throw new RetryExhaustedError(`Retry exhausted after ${attempt} attempts`, lastError);
    }
    calculateDelay(attempt) {
        let delay = this.config.baseDelayMs * Math.pow(this.config.exponentialBase, attempt - 1);
        delay = Math.min(delay, this.config.maxDelayMs);
        if (this.config.jitter) {
            // Add jitter: ±25%
            const jitterRange = delay * 0.25;
            delay += (Math.random() - 0.5) * 2 * jitterRange;
        }
        return Math.floor(delay);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryHandler = RetryHandler;
// =============================================================================
// BULKHEAD
// =============================================================================
class Bulkhead {
    config;
    activeCalls = 0;
    queue = [];
    constructor(config) {
        this.config = config;
    }
    /**
     * Execute with bulkhead isolation
     */
    async execute(fn) {
        await this.acquire();
        try {
            return await fn();
        }
        finally {
            this.release();
        }
    }
    /**
     * Get current utilization
     */
    getStats() {
        return {
            active: this.activeCalls,
            queued: this.queue.length,
            available: this.config.maxConcurrent - this.activeCalls,
        };
    }
    async acquire() {
        if (this.activeCalls < this.config.maxConcurrent) {
            this.activeCalls++;
            return;
        }
        if (this.queue.length >= this.config.maxQueued) {
            throw new BulkheadFullError(this.config.name);
        }
        return new Promise((resolve, reject) => {
            const entry = { resolve, reject, timeout: undefined };
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
    release() {
        this.activeCalls--;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next.timeout) {
                clearTimeout(next.timeout);
            }
            this.activeCalls++;
            next.resolve();
        }
    }
}
exports.Bulkhead = Bulkhead;
// =============================================================================
// RATE LIMITER
// =============================================================================
class RateLimiter {
    config;
    tokens;
    lastRefill;
    requests = []; // For sliding window
    constructor(config) {
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
    async tryAcquire() {
        if (this.config.strategy === 'sliding') {
            return this.tryAcquireSlidingWindow();
        }
        return this.tryAcquireTokenBucket();
    }
    /**
     * Execute with rate limiting
     */
    async execute(fn) {
        if (!await this.tryAcquire()) {
            throw new RateLimitExceededError(this.config.name, this.getRetryAfter());
        }
        return fn();
    }
    /**
     * Get time until next request allowed
     */
    getRetryAfter() {
        if (this.config.strategy === 'sliding') {
            if (this.requests.length < this.config.maxRequests)
                return 0;
            const oldest = this.requests[0];
            return Math.max(0, this.config.windowMs - (Date.now() - oldest));
        }
        if (this.tokens > 0)
            return 0;
        const elapsed = Date.now() - this.lastRefill;
        return Math.max(0, this.config.windowMs - elapsed);
    }
    tryAcquireSlidingWindow() {
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
    tryAcquireTokenBucket() {
        this.refillTokens();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    }
    refillTokens() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        if (elapsed >= this.config.windowMs) {
            this.tokens = this.config.maxRequests;
            this.lastRefill = now;
        }
    }
}
exports.RateLimiter = RateLimiter;
// =============================================================================
// RESILIENCE POLICY EXECUTOR
// =============================================================================
class ResilienceExecutor {
    circuitBreakers = new Map();
    bulkheads = new Map();
    rateLimiters = new Map();
    retryHandlers = new Map();
    /**
     * Execute with a complete resilience policy
     */
    async execute(name, fn, policy) {
        // Setup components if not exists
        this.ensureComponents(name, policy);
        // Wrap function with all resilience patterns
        let wrappedFn = fn;
        // 1. Rate limiting (outermost)
        if (policy.rateLimiter) {
            const limiter = this.rateLimiters.get(name);
            const innerFn = wrappedFn;
            wrappedFn = () => limiter.execute(innerFn);
        }
        // 2. Bulkhead
        if (policy.bulkhead) {
            const bulkhead = this.bulkheads.get(name);
            const innerFn = wrappedFn;
            wrappedFn = () => bulkhead.execute(innerFn);
        }
        // 3. Circuit breaker
        if (policy.circuitBreaker) {
            const breaker = this.circuitBreakers.get(name);
            const innerFn = wrappedFn;
            wrappedFn = () => breaker.execute(innerFn);
        }
        // 4. Retry (innermost, around circuit breaker)
        if (policy.retry) {
            const retry = this.retryHandlers.get(name);
            const innerFn = wrappedFn;
            wrappedFn = () => retry.execute(innerFn);
        }
        // 5. Timeout
        if (policy.timeout) {
            const innerFn = wrappedFn;
            wrappedFn = () => this.withTimeout(innerFn, policy.timeout);
        }
        // Execute with optional fallback
        try {
            return await wrappedFn();
        }
        catch (error) {
            if (policy.fallback) {
                return policy.fallback(error);
            }
            throw error;
        }
    }
    /**
     * Get statistics for all components
     */
    getStats(name) {
        const stats = {};
        const cb = this.circuitBreakers.get(name);
        if (cb)
            stats.circuitBreaker = cb.getStats();
        const bh = this.bulkheads.get(name);
        if (bh)
            stats.bulkhead = bh.getStats();
        const rl = this.rateLimiters.get(name);
        if (rl)
            stats.rateLimiter = { retryAfter: rl.getRetryAfter() };
        return stats;
    }
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(name) {
        this.circuitBreakers.get(name)?.reset();
    }
    ensureComponents(name, policy) {
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
    async withTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => {
                setTimeout(() => reject(new TimeoutError('operation', timeout)), timeout);
            }),
        ]);
    }
    destroy() {
        for (const cb of this.circuitBreakers.values()) {
            cb.destroy();
        }
    }
}
exports.ResilienceExecutor = ResilienceExecutor;
// =============================================================================
// PRESET POLICIES
// =============================================================================
exports.PresetPolicies = {
    /**
     * Policy for LLM API calls
     */
    llmApi: () => ({
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
                if (error.message.includes('429'))
                    return true;
                if (error.message.includes('503'))
                    return true;
                if (error.message.includes('timeout'))
                    return true;
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
    database: () => ({
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
    redis: () => ({
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
    externalApi: () => ({
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
class CircuitOpenError extends Error {
    constructor(name, retryAfter) {
        super(`Circuit breaker '${name}' is open. Retry after ${retryAfter}ms`);
        this.name = 'CircuitOpenError';
    }
}
exports.CircuitOpenError = CircuitOpenError;
class TimeoutError extends Error {
    constructor(name, timeout) {
        super(`Operation '${name}' timed out after ${timeout}ms`);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class RetryExhaustedError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.name = 'RetryExhaustedError';
        this.cause = cause;
    }
}
exports.RetryExhaustedError = RetryExhaustedError;
class BulkheadFullError extends Error {
    constructor(name) {
        super(`Bulkhead '${name}' is full`);
        this.name = 'BulkheadFullError';
    }
}
exports.BulkheadFullError = BulkheadFullError;
class BulkheadTimeoutError extends Error {
    constructor(name) {
        super(`Bulkhead '${name}' queue timeout`);
        this.name = 'BulkheadTimeoutError';
    }
}
exports.BulkheadTimeoutError = BulkheadTimeoutError;
class RateLimitExceededError extends Error {
    retryAfter;
    constructor(name, retryAfter) {
        super(`Rate limit exceeded for '${name}'. Retry after ${retryAfter}ms`);
        this.name = 'RateLimitExceededError';
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitExceededError = RateLimitExceededError;
// =============================================================================
// FACTORY
// =============================================================================
function createResilienceExecutor() {
    return new ResilienceExecutor();
}
