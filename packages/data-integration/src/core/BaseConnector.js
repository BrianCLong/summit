"use strict";
/**
 * Base connector class that all data source connectors extend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConnector = void 0;
const events_1 = require("events");
class BaseConnector extends events_1.EventEmitter {
    config;
    logger;
    isConnected = false;
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger;
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        if (!this.config.id) {
            throw new Error('Data source ID is required');
        }
        if (!this.config.name) {
            throw new Error('Data source name is required');
        }
        if (!this.config.type) {
            throw new Error('Data source type is required');
        }
    }
    /**
     * Emit progress event
     */
    emitProgress(recordsProcessed, bytesProcessed) {
        this.emit('progress', {
            recordsProcessed,
            bytesProcessed,
            timestamp: new Date()
        });
    }
    /**
     * Emit error event
     */
    emitError(error) {
        this.emit('error', error);
    }
    /**
     * Handle retry logic with exponential backoff
     */
    async withRetry(operation, operationName) {
        const retryConfig = this.config.connectionConfig.retryConfig || {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2
        };
        let lastError;
        for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === retryConfig.maxRetries) {
                    this.logger.error(`${operationName} failed after ${retryConfig.maxRetries} retries`, {
                        error: lastError.message
                    });
                    throw lastError;
                }
                const delay = Math.min(retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt), retryConfig.maxDelayMs);
                this.logger.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`, {
                    error: lastError.message
                });
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Rate limiting utility
     */
    async rateLimit() {
        const rateLimitConfig = this.config.extractionConfig.rateLimitConfig;
        if (!rateLimitConfig) {
            return;
        }
        // Simple rate limiting implementation
        // In production, use a more sophisticated rate limiter like bottleneck
        const delayMs = 1000 / rateLimitConfig.maxRequestsPerSecond;
        await this.sleep(delayMs);
    }
    /**
     * Check if connector is connected
     */
    isConnectionActive() {
        return this.isConnected;
    }
    /**
     * Get data source configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.BaseConnector = BaseConnector;
