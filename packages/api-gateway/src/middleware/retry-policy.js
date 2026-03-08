"use strict";
/**
 * Retry Policy Middleware
 *
 * Implements intelligent retry strategies for failed requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryPolicy = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('retry-policy');
class RetryPolicy {
    config;
    constructor(config) {
        this.config = {
            retryableStatusCodes: [408, 429, 500, 502, 503, 504],
            retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
            jitter: true,
            ...config,
        };
    }
    shouldRetry(error, statusCode, attempt) {
        if (attempt !== undefined && attempt >= this.config.maxRetries) {
            return false;
        }
        // Check status code
        if (statusCode && this.config.retryableStatusCodes?.includes(statusCode)) {
            return true;
        }
        // Check error type
        const errorMessage = error.message || String(error);
        return this.config.retryableErrors?.some(err => errorMessage.includes(err)) || false;
    }
    calculateDelay(attempt) {
        let delay;
        if (this.config.exponentialBackoff) {
            delay = Math.min(this.config.initialDelay * Math.pow(2, attempt), this.config.maxDelay);
        }
        else {
            delay = this.config.initialDelay;
        }
        // Add jitter to prevent thundering herd
        if (this.config.jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }
        return Math.floor(delay);
    }
    async executeWithRetry(operation, context) {
        let lastError = null;
        let attempt = 0;
        while (attempt <= this.config.maxRetries) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (!this.shouldRetry(lastError, undefined, attempt)) {
                    throw lastError;
                }
                const delay = this.calculateDelay(attempt);
                logger.warn('Request failed, retrying', {
                    attempt: attempt + 1,
                    maxRetries: this.config.maxRetries,
                    delay,
                    error: lastError.message,
                    context,
                });
                await this.sleep(delay);
                attempt++;
            }
        }
        throw lastError || new Error('Max retries exceeded');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.RetryPolicy = RetryPolicy;
