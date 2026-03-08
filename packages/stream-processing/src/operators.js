"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitOperator = exports.EnrichOperator = exports.CircuitBreakerOperator = exports.RetryOperator = exports.BatchOperator = exports.SampleOperator = exports.DebounceOperator = exports.ThrottleOperator = exports.DeduplicateOperator = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'stream-operators' });
/**
 * Common stream operators
 */
/**
 * Deduplicate operator
 */
class DeduplicateOperator {
    keyExtractor;
    name = 'deduplicate';
    seen = new Set();
    maxSize = 100000;
    constructor(keyExtractor, maxSize) {
        this.keyExtractor = keyExtractor;
        if (maxSize) {
            this.maxSize = maxSize;
        }
    }
    async process(input) {
        const key = this.keyExtractor(input);
        if (this.seen.has(key)) {
            return [];
        }
        this.seen.add(key);
        // Prevent unbounded growth
        if (this.seen.size > this.maxSize) {
            const iterator = this.seen.values();
            this.seen.delete(iterator.next().value);
        }
        return input;
    }
}
exports.DeduplicateOperator = DeduplicateOperator;
/**
 * Throttle operator
 */
class ThrottleOperator {
    intervalMs;
    name = 'throttle';
    lastEmit = 0;
    constructor(intervalMs) {
        this.intervalMs = intervalMs;
    }
    async process(input) {
        const now = Date.now();
        if (now - this.lastEmit < this.intervalMs) {
            return [];
        }
        this.lastEmit = now;
        return input;
    }
}
exports.ThrottleOperator = ThrottleOperator;
/**
 * Debounce operator
 */
class DebounceOperator {
    delayMs;
    name = 'debounce';
    timer = null;
    pendingValue = null;
    resolver = null;
    constructor(delayMs) {
        this.delayMs = delayMs;
    }
    async process(input) {
        this.pendingValue = input;
        if (this.timer) {
            clearTimeout(this.timer);
        }
        return new Promise((resolve) => {
            this.resolver = resolve;
            this.timer = setTimeout(() => {
                if (this.pendingValue !== null) {
                    resolve(this.pendingValue);
                    this.pendingValue = null;
                }
            }, this.delayMs);
        });
    }
}
exports.DebounceOperator = DebounceOperator;
/**
 * Sample operator (take every Nth element)
 */
class SampleOperator {
    n;
    name = 'sample';
    count = 0;
    constructor(n) {
        this.n = n;
    }
    async process(input) {
        this.count++;
        if (this.count % this.n === 0) {
            return input;
        }
        return [];
    }
}
exports.SampleOperator = SampleOperator;
/**
 * Batch operator
 */
class BatchOperator {
    batchSize;
    timeoutMs;
    name = 'batch';
    batch = [];
    constructor(batchSize, timeoutMs) {
        this.batchSize = batchSize;
        this.timeoutMs = timeoutMs;
        if (timeoutMs) {
            setInterval(() => {
                if (this.batch.length > 0) {
                    this.flush();
                }
            }, timeoutMs);
        }
    }
    async process(input) {
        this.batch.push(input);
        if (this.batch.length >= this.batchSize) {
            return [this.flush()];
        }
        return [];
    }
    flush() {
        const result = this.batch;
        this.batch = [];
        return result;
    }
}
exports.BatchOperator = BatchOperator;
/**
 * Retry operator
 */
class RetryOperator {
    operation;
    maxRetries;
    retryDelayMs;
    name = 'retry';
    constructor(operation, maxRetries = 3, retryDelayMs = 1000) {
        this.operation = operation;
        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
    }
    async process(input) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.operation(input);
            }
            catch (error) {
                lastError = error;
                logger.warn({ error, attempt, maxRetries: this.maxRetries }, 'Retry attempt failed');
                if (attempt < this.maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs * Math.pow(2, attempt)));
                }
            }
        }
        throw lastError;
    }
}
exports.RetryOperator = RetryOperator;
/**
 * Circuit breaker operator
 */
class CircuitBreakerOperator {
    operation;
    failureThreshold;
    resetTimeoutMs;
    name = 'circuit-breaker';
    failureCount = 0;
    lastFailureTime = 0;
    state = 'CLOSED';
    constructor(operation, failureThreshold = 5, resetTimeoutMs = 60000) {
        this.operation = operation;
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }
    async process(input) {
        // Check if circuit should be reset
        if (this.state === 'OPEN' &&
            Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
            this.state = 'HALF_OPEN';
            this.failureCount = 0;
            logger.info('Circuit breaker half-open');
        }
        // Reject if circuit is open
        if (this.state === 'OPEN') {
            throw new Error('Circuit breaker is OPEN');
        }
        try {
            const result = await this.operation(input);
            // Success in half-open state closes circuit
            if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED';
                this.failureCount = 0;
                logger.info('Circuit breaker closed');
            }
            return result;
        }
        catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            if (this.failureCount >= this.failureThreshold) {
                this.state = 'OPEN';
                logger.warn('Circuit breaker opened');
            }
            throw error;
        }
    }
}
exports.CircuitBreakerOperator = CircuitBreakerOperator;
/**
 * Enrich operator
 */
class EnrichOperator {
    enrichmentFunction;
    name = 'enrich';
    constructor(enrichmentFunction) {
        this.enrichmentFunction = enrichmentFunction;
    }
    async process(input) {
        const enrichment = await this.enrichmentFunction(input);
        return { ...input, ...enrichment };
    }
}
exports.EnrichOperator = EnrichOperator;
/**
 * Split operator
 */
class SplitOperator {
    predicate;
    outputTags;
    name = 'split';
    outputs = new Map();
    constructor(predicate, outputTags) {
        this.predicate = predicate;
        this.outputTags = outputTags;
        for (const tag of outputTags) {
            this.outputs.set(tag, []);
        }
    }
    async process(input) {
        const tag = this.predicate(input);
        if (this.outputs.has(tag)) {
            this.outputs.get(tag).push(input);
        }
        return input;
    }
    getOutput(tag) {
        return this.outputs.get(tag) || [];
    }
    clearOutputs() {
        for (const tag of this.outputTags) {
            this.outputs.set(tag, []);
        }
    }
}
exports.SplitOperator = SplitOperator;
