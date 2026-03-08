"use strict";
/**
 * Retry Logic with Exponential Backoff and Jitter
 *
 * Provides bounded retries with configurable backoff strategy
 * for resilient ingest processing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY_CONFIG = void 0;
exports.calculateDelay = calculateDelay;
exports.sleep = sleep;
exports.classifyError = classifyError;
exports.isRetryable = isRetryable;
exports.retry = retry;
exports.createRetrier = createRetrier;
exports.Retryable = Retryable;
/**
 * Default retry configuration.
 */
exports.DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2.0,
    jitterFactor: 0.1,
    nonRetryableErrors: [
        'SCHEMA_DRIFT',
        'VALIDATION_FAIL',
        'OLDER_REVISION',
        'CONSTRAINT_VIOLATION',
        'SERIALIZATION_ERROR',
    ],
};
/**
 * Calculate delay for a given attempt with exponential backoff and jitter.
 */
function calculateDelay(attempt, config) {
    // Base delay with exponential backoff (attempt is 1-indexed)
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    // Add jitter (±jitter_factor * delay)
    const jitterRange = cappedDelay * config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.max(0, Math.round(cappedDelay + jitter));
}
/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Classify an error into a DLQ reason code.
 */
function classifyError(error) {
    if (!error)
        return 'UNKNOWN';
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();
    const name = err.name.toLowerCase();
    if (message.includes('validation') || message.includes('invalid')) {
        return 'VALIDATION_FAIL';
    }
    if (message.includes('schema') || message.includes('drift')) {
        return 'SCHEMA_DRIFT';
    }
    if (message.includes('revision') || message.includes('older') || message.includes('stale')) {
        return 'OLDER_REVISION';
    }
    if (message.includes('timeout') || message.includes('timed out') || name.includes('timeout')) {
        return 'SINK_TIMEOUT';
    }
    if (message.includes('constraint') ||
        message.includes('duplicate') ||
        message.includes('unique') ||
        message.includes('23505') // PostgreSQL unique violation
    ) {
        return 'CONSTRAINT_VIOLATION';
    }
    if (message.includes('serialize') || message.includes('json') || message.includes('parse')) {
        return 'SERIALIZATION_ERROR';
    }
    if (message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('socket hang up')) {
        return 'CONNECTION_ERROR';
    }
    if (message.includes('rate') ||
        message.includes('429') ||
        message.includes('throttle') ||
        message.includes('too many')) {
        return 'RATE_LIMITED';
    }
    if (message.includes('circuit') || message.includes('breaker')) {
        return 'CIRCUIT_OPEN';
    }
    return 'UNKNOWN';
}
/**
 * Check if an error is retryable based on its reason code.
 */
function isRetryable(error, config) {
    const reasonCode = classifyError(error);
    return !config.nonRetryableErrors?.includes(reasonCode);
}
/**
 * Execute a function with retry logic.
 */
async function retry(fn, config = exports.DEFAULT_RETRY_CONFIG, callbacks) {
    let lastError;
    let totalDelayMs = 0;
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        const context = {
            attempt,
            maxAttempts: config.maxAttempts,
            totalDelayMs,
            lastError,
        };
        try {
            const value = await fn();
            return {
                success: true,
                value,
                attempts: attempt,
                totalDelayMs,
            };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Call error callback
            callbacks?.onError?.(lastError, context);
            // Check if we should retry
            if (attempt < config.maxAttempts) {
                const shouldRetry = callbacks?.shouldRetry
                    ? callbacks.shouldRetry(lastError, context)
                    : isRetryable(lastError, config);
                if (!shouldRetry) {
                    // Non-retryable error
                    return {
                        success: false,
                        error: lastError,
                        attempts: attempt,
                        totalDelayMs,
                        reasonCode: classifyError(lastError),
                    };
                }
                // Calculate and apply delay
                const delayMs = calculateDelay(attempt, config);
                totalDelayMs += delayMs;
                // Call retry callback
                callbacks?.onRetry?.({ ...context, totalDelayMs });
                await sleep(delayMs);
            }
        }
    }
    // All retries exhausted
    return {
        success: false,
        error: lastError,
        attempts: config.maxAttempts,
        totalDelayMs,
        reasonCode: lastError ? classifyError(lastError) : 'MAX_RETRIES_EXCEEDED',
    };
}
/**
 * Create a reusable retry wrapper.
 */
function createRetrier(config = exports.DEFAULT_RETRY_CONFIG) {
    return {
        /**
         * Execute with retry.
         */
        async execute(fn, callbacks) {
            return retry(fn, config, callbacks);
        },
        /**
         * Execute with retry, throwing on failure.
         */
        async executeOrThrow(fn, callbacks) {
            const result = await retry(fn, config, callbacks);
            if (!result.success) {
                throw result.error ?? new Error('Retry failed');
            }
            return result.value;
        },
        /**
         * Get the config.
         */
        getConfig() {
            return { ...config };
        },
    };
}
/**
 * Decorator for retrying class methods.
 */
function Retryable(config = exports.DEFAULT_RETRY_CONFIG) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        if (!originalMethod) {
            return descriptor;
        }
        descriptor.value = async function (...args) {
            const result = await retry(() => originalMethod.apply(this, args), config);
            if (!result.success) {
                throw result.error ?? new Error('Retry failed');
            }
            return result.value;
        };
        return descriptor;
    };
}
