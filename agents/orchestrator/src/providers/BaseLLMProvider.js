"use strict";
/**
 * Base LLM Provider Interface
 *
 * Abstract base class for all LLM providers with common functionality
 * including retries, timeouts, and metrics tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMProvider = void 0;
const eventemitter3_1 = require("eventemitter3");
class BaseLLMProvider extends eventemitter3_1.EventEmitter {
    config;
    metrics;
    constructor(config) {
        super();
        this.config = config;
        this.metrics = this.initializeMetrics();
    }
    /**
     * Execute with retry logic
     */
    async executeWithRetry(operation, maxRetries = this.config.retries) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.withTimeout(operation(), this.config.timeout);
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                    this.emit('retry', {
                        provider: this.provider,
                        attempt: attempt + 1,
                        maxRetries,
                        delay,
                        error: lastError.message,
                    });
                    await this.sleep(delay);
                }
            }
        }
        throw lastError;
    }
    /**
     * Wrap a promise with a timeout
     */
    async withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)),
        ]);
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Update metrics after a request
     */
    updateMetrics(success, latencyMs, usage) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        // Update latency (exponential moving average)
        const alpha = 0.1;
        this.metrics.averageLatencyMs =
            (1 - alpha) * this.metrics.averageLatencyMs + alpha * latencyMs;
        // Update p95/p99 (simplified)
        if (latencyMs > this.metrics.p95LatencyMs * 0.95) {
            this.metrics.p95LatencyMs = Math.max(this.metrics.p95LatencyMs, latencyMs);
        }
        if (latencyMs > this.metrics.p99LatencyMs * 0.99) {
            this.metrics.p99LatencyMs = Math.max(this.metrics.p99LatencyMs, latencyMs);
        }
        this.metrics.totalTokens += usage.totalTokens;
        this.metrics.totalCostUSD += usage.estimatedCostUSD;
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = this.initializeMetrics();
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatencyMs: 0,
            p95LatencyMs: 0,
            p99LatencyMs: 0,
            totalTokens: 0,
            totalCostUSD: 0,
            lastReset: new Date(),
        };
    }
    /**
     * Generate a unique response ID
     */
    generateResponseId() {
        return `${this.provider}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.BaseLLMProvider = BaseLLMProvider;
