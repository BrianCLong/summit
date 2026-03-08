"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resilience = exports.Bulkhead = exports.CircuitBreaker = exports.RetryPolicy = void 0;
exports.withTimeout = withTimeout;
const logger_js_1 = require("../config/logger.js");
const events_1 = require("events");
// --- Components ---
/**
 * Timeout Wrapper
 */
async function withTimeout(fn, timeoutMs, operationName = 'operation') {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        fn().then((result) => {
            clearTimeout(timer);
            resolve(result);
        }, (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
/**
 * Retry Policy
 */
class RetryPolicy {
    options;
    constructor(options) {
        this.options = {
            backoffMultiplier: 2,
            jitterFactor: 0.1,
            retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
            ...options,
        };
    }
    async execute(fn, operationName = 'operation') {
        let lastError;
        for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (!this.shouldRetry(error, attempt)) {
                    throw error;
                }
                if (attempt < this.options.maxAttempts) {
                    const delay = this.calculateDelay(attempt);
                    logger_js_1.logger.warn(`Retry attempt ${attempt}/${this.options.maxAttempts} for '${operationName}' in ${delay}ms. Error: ${error.message}`);
                    await new Promise((r) => setTimeout(r, delay));
                }
            }
        }
        throw lastError;
    }
    shouldRetry(error, attempt) {
        if (attempt >= this.options.maxAttempts)
            return false;
        // Don't retry 4xx (except maybe 429, but typically handled by rate limiters)
        if (error.status && error.status >= 400 && error.status < 500)
            return false;
        return this.options.retryableErrors.some((pattern) => {
            if (typeof pattern === 'string') {
                return error.code === pattern || error.message?.includes(pattern);
            }
            return pattern.test(error.message || '');
        });
    }
    calculateDelay(attempt) {
        const exponentialDelay = Math.min(this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1), this.options.maxDelay);
        const jitter = exponentialDelay * this.options.jitterFactor * Math.random();
        return Math.floor(exponentialDelay + jitter);
    }
}
exports.RetryPolicy = RetryPolicy;
/**
 * Circuit Breaker
 */
class CircuitBreaker extends events_1.EventEmitter {
    name;
    state = 'CLOSED';
    failures = 0;
    lastFailureTime = 0;
    options;
    constructor(name, options) {
        super();
        this.name = name;
        this.options = {
            monitoringWindow: 60000,
            expectedErrors: [],
            ...options,
        };
    }
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
                this.transition('HALF_OPEN');
            }
            else {
                throw new Error(`CircuitBreaker '${this.name}' is OPEN`);
            }
        }
        try {
            const result = await fn();
            if (this.state === 'HALF_OPEN') {
                this.transition('CLOSED');
            }
            return result;
        }
        catch (error) {
            if (this.isFailure(error)) {
                this.recordFailure();
            }
            throw error;
        }
    }
    isFailure(error) {
        // If expected error (e.g. business logic error), don't trip
        if (this.options.expectedErrors.includes(error.code) ||
            this.options.expectedErrors.some(msg => error.message?.includes(msg))) {
            return false;
        }
        return true;
    }
    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold) {
            this.transition('OPEN');
        }
        else if (this.state === 'HALF_OPEN') {
            this.transition('OPEN');
        }
    }
    transition(newState) {
        this.state = newState;
        if (newState === 'CLOSED') {
            this.failures = 0;
            this.emit('reset');
        }
        else if (newState === 'OPEN') {
            this.emit('trip');
        }
        else if (newState === 'HALF_OPEN') {
            this.emit('halfOpen');
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Bulkhead
 */
class Bulkhead {
    name;
    options;
    active = 0;
    queue = [];
    constructor(name, options) {
        this.name = name;
        this.options = options;
    }
    async execute(fn) {
        if (this.active >= this.options.maxConcurrent) {
            if (this.queue.length >= this.options.queueSize) {
                throw new Error(`Bulkhead '${this.name}' queue full`);
            }
            await new Promise((resolve, reject) => {
                // Enqueue with timeout
                const timer = setTimeout(() => {
                    // Remove from queue
                    const idx = this.queue.indexOf(next);
                    if (idx > -1)
                        this.queue.splice(idx, 1);
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
        }
        finally {
            this.active--;
            const next = this.queue.shift();
            if (next)
                next();
        }
    }
}
exports.Bulkhead = Bulkhead;
/**
 * Resilience Manager Singleton
 */
class ResilienceManager {
    breakers = new Map();
    bulkheads = new Map();
    retries = new Map();
    getCircuitBreaker(name, options) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name);
    }
    getBulkhead(name, options) {
        if (!this.bulkheads.has(name)) {
            this.bulkheads.set(name, new Bulkhead(name, options));
        }
        return this.bulkheads.get(name);
    }
    getRetryPolicy(name, options) {
        if (!this.retries.has(name)) {
            this.retries.set(name, new RetryPolicy(options));
        }
        return this.retries.get(name);
    }
    async execute(name, fn, options) {
        let wrapped = fn;
        // 1. Timeout (innermost)
        if (options.enableTimeout !== false && options.timeout) {
            const original = wrapped;
            wrapped = () => withTimeout(original, options.timeout, name);
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
exports.resilience = new ResilienceManager();
