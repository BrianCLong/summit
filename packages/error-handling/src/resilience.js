"use strict";
/**
 * Resilience Patterns Integration
 * Integrates circuit breaker, retry, timeout, and graceful degradation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryPolicies = void 0;
exports.getCircuitBreaker = getCircuitBreaker;
exports.executeWithCircuitBreaker = executeWithCircuitBreaker;
exports.executeWithRetry = executeWithRetry;
exports.executeWithTimeout = executeWithTimeout;
exports.executeWithResilience = executeWithResilience;
exports.withGracefulDegradation = withGracefulDegradation;
exports.executeOptional = executeOptional;
exports.getHealthStatus = getHealthStatus;
exports.resetAllCircuitBreakers = resetAllCircuitBreakers;
exports.getCircuitBreakerMetrics = getCircuitBreakerMetrics;
const pino_1 = __importDefault(require("pino"));
const orchestration_1 = require("@intelgraph/orchestration");
const errors_js_1 = require("./errors.js");
const logger = (0, pino_1.default)({ name: 'Resilience' });
/**
 * Circuit breakers registry
 */
const circuitBreakers = new Map();
/**
 * Get or create circuit breaker for a service
 */
function getCircuitBreaker(serviceName, config) {
    if (circuitBreakers.has(serviceName)) {
        return circuitBreakers.get(serviceName);
    }
    const defaultConfig = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000, // 30 seconds
        monitoringPeriod: 60000, // 1 minute
    };
    const breaker = new orchestration_1.CircuitBreaker(serviceName, {
        ...defaultConfig,
        ...config,
    });
    // Setup event listeners for logging
    breaker.on('state.changed', ({ name, state }) => {
        logger.info({ service: name, state }, `Circuit breaker state changed: ${state}`);
    });
    breaker.on('circuit.opened', ({ name, failures }) => {
        logger.warn({ service: name, failures }, 'Circuit breaker opened');
    });
    breaker.on('circuit.closed', ({ name }) => {
        logger.info({ service: name }, 'Circuit breaker closed');
    });
    circuitBreakers.set(serviceName, breaker);
    return breaker;
}
/**
 * Execute function with circuit breaker protection
 */
async function executeWithCircuitBreaker(serviceName, fn, config) {
    const breaker = getCircuitBreaker(serviceName, config);
    try {
        return await breaker.execute(fn);
    }
    catch (error) {
        if (error.message?.includes('Circuit breaker') && error.message?.includes('is OPEN')) {
            throw new errors_js_1.CircuitBreakerError(serviceName, {
                state: breaker.getState(),
                metrics: breaker.getMetrics(),
            });
        }
        throw error;
    }
}
/**
 * Default retry policies for different scenarios
 */
exports.RetryPolicies = {
    /**
     * Default retry policy - exponential backoff
     */
    default: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
    },
    /**
     * Database retry policy - shorter delays
     */
    database: {
        maxRetries: 3,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: [
            'DATABASE_CONNECTION_FAILED',
            'DATABASE_TIMEOUT',
            'POSTGRES_ERROR',
            'NEO4J_ERROR',
        ],
    },
    /**
     * External service retry policy
     */
    externalService: {
        maxRetries: 4,
        initialDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableErrors: [
            'EXTERNAL_SERVICE_ERROR',
            'OPERATION_TIMEOUT',
            'GATEWAY_TIMEOUT',
            'SERVICE_UNAVAILABLE',
        ],
    },
    /**
     * Quick retry policy - for fast operations
     */
    quick: {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
    },
    /**
     * No retry policy
     */
    none: {
        maxRetries: 0,
        initialDelay: 0,
        maxDelay: 0,
        backoffMultiplier: 1,
    },
};
/**
 * Execute function with retry logic
 */
async function executeWithRetry(fn, policy = exports.RetryPolicies.default, context) {
    try {
        return await orchestration_1.RetryHandler.executeWithRetry(fn, policy);
    }
    catch (error) {
        logger.error({
            error: error instanceof errors_js_1.AppError ? error.toJSON() : error,
            policy,
            context,
        }, 'Retry attempts exhausted');
        throw (0, errors_js_1.toAppError)(error);
    }
}
/**
 * Execute function with timeout
 */
async function executeWithTimeout(fn, timeoutMs, operation) {
    try {
        return await orchestration_1.TimeoutHandler.executeWithTimeout(fn, timeoutMs);
    }
    catch (error) {
        if (error.message?.includes('timeout')) {
            throw new errors_js_1.TimeoutError(operation, timeoutMs);
        }
        throw (0, errors_js_1.toAppError)(error);
    }
}
/**
 * Execute with full resilience (circuit breaker + retry + timeout)
 */
async function executeWithResilience(options) {
    const { serviceName, operation, fn, retryPolicy = exports.RetryPolicies.default, timeoutMs = 30000, circuitBreakerConfig, } = options;
    const resilientFn = async () => {
        // Wrap with timeout
        const fnWithTimeout = () => executeWithTimeout(fn, timeoutMs, `${serviceName}.${operation}`);
        // Wrap with retry
        const fnWithRetry = () => executeWithRetry(fnWithTimeout, retryPolicy, {
            operation,
            service: serviceName,
        });
        // Execute with circuit breaker
        return executeWithCircuitBreaker(serviceName, fnWithRetry, circuitBreakerConfig);
    };
    try {
        return await resilientFn();
    }
    catch (error) {
        logger.error({
            service: serviceName,
            operation,
            error: error instanceof errors_js_1.AppError ? error.toJSON() : error,
        }, 'Resilient execution failed');
        throw error;
    }
}
/**
 * Graceful degradation wrapper
 * Returns fallback value if operation fails
 */
async function withGracefulDegradation(fn, fallback, options) {
    try {
        return await fn();
    }
    catch (error) {
        if (options?.logError !== false) {
            logger.warn({
                service: options?.serviceName,
                operation: options?.operation,
                error: error instanceof errors_js_1.AppError ? error.toJSON() : error,
                fallback,
            }, 'Operation failed, using fallback value');
        }
        return fallback;
    }
}
/**
 * Graceful degradation for optional features
 * Logs error but doesn't throw
 */
async function executeOptional(fn, options) {
    return withGracefulDegradation(fn, null, {
        ...options,
        logError: true,
    });
}
function getHealthStatus() {
    const circuitBreakerStatus = {};
    circuitBreakers.forEach((breaker, name) => {
        circuitBreakerStatus[name] = {
            state: breaker.getState(),
            metrics: breaker.getMetrics(),
        };
    });
    const allClosed = Array.from(circuitBreakers.values()).every((breaker) => breaker.getState() === 'closed');
    return {
        healthy: allClosed,
        details: {
            circuitBreakers: circuitBreakerStatus,
        },
    };
}
/**
 * Reset all circuit breakers (useful for testing)
 */
function resetAllCircuitBreakers() {
    circuitBreakers.forEach((breaker) => breaker.reset());
    logger.info('All circuit breakers reset');
}
/**
 * Get circuit breaker metrics
 */
function getCircuitBreakerMetrics() {
    const metrics = {};
    circuitBreakers.forEach((breaker, name) => {
        metrics[name] = breaker.getMetrics();
    });
    return metrics;
}
