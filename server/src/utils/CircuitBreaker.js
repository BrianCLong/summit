"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
// @ts-ignore
const pino_1 = __importDefault(require("pino"));
// @ts-ignore
const logger = pino_1.default();
/**
 * Enum representing the possible states of a Circuit Breaker.
 */
var CircuitBreakerState;
(function (CircuitBreakerState) {
    /**
     * Normal operation; requests are passed through.
     */
    CircuitBreakerState["CLOSED"] = "CLOSED";
    /**
     * The circuit is open; requests are rejected immediately.
     */
    CircuitBreakerState["OPEN"] = "OPEN";
    /**
     * The circuit is testing if the service has recovered; limited requests allowed.
     */
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (CircuitBreakerState = {}));
/**
 * Circuit Breaker implementation to prevent cascading failures.
 *
 * It monitors the execution of a command and manages the state (CLOSED, OPEN, HALF_OPEN)
 * based on failures, latency, and error rates.
 */
class CircuitBreaker {
    state = CircuitBreakerState.CLOSED;
    failureCount = 0;
    successCount = 0;
    lastFailureTime = 0;
    options;
    metrics;
    /**
     * Creates an instance of CircuitBreaker.
     *
     * @param options - Configuration options for the circuit breaker.
     */
    constructor(options) {
        this.options = {
            failureThreshold: 5,
            successThreshold: 3,
            resetTimeout: 30000, // 30 seconds
            p95ThresholdMs: 2000, // 2 seconds
            errorRateThreshold: 0.5, // 50%
            ...options,
        };
        this.metrics = {
            totalRequests: 0,
            failedRequests: 0,
            latencies: [],
            stateChanges: 0,
        };
        logger.info(`Circuit Breaker initialized with options: ${JSON.stringify(this.options)}`);
    }
    /**
     * Gets the current state of the circuit breaker.
     *
     * @returns The current CircuitBreakerState.
     */
    getState() {
        return this.state;
    }
    /**
     * Retrieves current metrics for the circuit breaker.
     *
     * @returns An object containing metrics such as total requests, failed requests, P95 latency, error rate, and current state.
     */
    getMetrics() {
        return {
            ...this.metrics,
            p95Latency: this.calculateP95Latency(),
            errorRate: this.metrics.totalRequests > 0
                ? this.metrics.failedRequests / this.metrics.totalRequests
                : 0,
            state: this.state,
        };
    }
    /**
     * Gets the number of consecutive failures.
     *
     * @returns The failure count.
     */
    getFailureCount() {
        return this.failureCount;
    }
    /**
     * Gets the timestamp of the last failure.
     *
     * @returns The timestamp (in milliseconds) of the last failure.
     */
    getLastFailureTime() {
        return this.lastFailureTime;
    }
    calculateP95Latency() {
        if (this.metrics.latencies.length === 0) {
            return 0;
        }
        const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
        const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;
        return sortedLatencies[p95Index];
    }
    recordLatency(latency) {
        this.metrics.latencies.push(latency);
        // Keep only a recent window of latencies (e.g., last 100)
        if (this.metrics.latencies.length > 100) {
            this.metrics.latencies.shift();
        }
    }
    evaluateState() {
        const { p95Latency, errorRate } = this.getMetrics();
        if (this.state === CircuitBreakerState.CLOSED) {
            if (this.failureCount >= this.options.failureThreshold ||
                p95Latency > this.options.p95ThresholdMs ||
                errorRate > this.options.errorRateThreshold) {
                this.open();
            }
        }
        else if (this.state === CircuitBreakerState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
                this.halfOpen();
            }
        }
        else if (this.state === CircuitBreakerState.HALF_OPEN) {
            // State transition handled by success/failure in execute
        }
    }
    open() {
        this.state = CircuitBreakerState.OPEN;
        this.lastFailureTime = Date.now();
        this.metrics.stateChanges++;
        logger.warn('Circuit Breaker: OPENED');
    }
    halfOpen() {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0; // Reset success count for half-open
        this.metrics.stateChanges++;
        logger.info('Circuit Breaker: HALF_OPEN');
    }
    close() {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.metrics.stateChanges++;
        logger.info('Circuit Breaker: CLOSED');
    }
    /**
     * Executes a command within the context of the circuit breaker.
     *
     * @typeParam T - The return type of the command.
     * @param command - The function to execute.
     * @returns The result of the command.
     * @throws Error if the circuit is OPEN or if the command itself fails.
     */
    async execute(command) {
        this.metrics.totalRequests++;
        this.evaluateState(); // Evaluate state before execution
        if (this.state === CircuitBreakerState.OPEN) {
            logger.debug('Circuit Breaker: Request rejected (OPEN)');
            throw new Error('CircuitBreaker: Service is currently unavailable');
        }
        try {
            const startTime = Date.now();
            const result = await command();
            const latency = Date.now() - startTime;
            this.recordLatency(latency);
            if (this.state === CircuitBreakerState.HALF_OPEN) {
                this.successCount++;
                if (this.successCount >= this.options.successThreshold) {
                    this.close();
                }
            }
            else if (this.state === CircuitBreakerState.CLOSED) {
                this.failureCount = 0; // Reset consecutive failures on success
            }
            return result;
        }
        catch (error) {
            this.metrics.failedRequests++;
            this.lastFailureTime = Date.now(); // Update last failure time
            if (this.state === CircuitBreakerState.HALF_OPEN) {
                // If a failure occurs in HALF_OPEN, immediately open the circuit again
                this.open();
            }
            else if (this.state === CircuitBreakerState.CLOSED) {
                this.failureCount++;
                this.evaluateState(); // Re-evaluate state on failure
            }
            logger.error(`Circuit Breaker: Command failed. State: ${this.state}, Failure Count: ${this.failureCount}. Error: ${error.message}`);
            throw error;
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
