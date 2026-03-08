"use strict";
/**
 * Base Provider Implementation
 *
 * Provides common functionality for all provider types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
const logger_js_1 = require("../utils/logger.js");
const time_js_1 = require("../utils/time.js");
class BaseProvider {
    config = null;
    initialized = false;
    lastHealthCheck = null;
    /**
     * Initialize the provider with configuration
     */
    async initialize(config) {
        this.config = config;
        this.initialized = true;
        logger_js_1.logger.info({ providerId: this.id, providerName: this.name }, 'Provider initialized');
    }
    /**
     * Check if provider is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get provider configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Create a health check result
     */
    createHealthResult(status, latencyMs, errorMessage, remainingQuota) {
        const health = {
            providerId: this.id,
            status,
            lastChecked: (0, time_js_1.now)(),
            latencyMs,
            errorMessage,
            remainingQuota,
        };
        this.lastHealthCheck = health;
        return health;
    }
    /**
     * Get last health check result
     */
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }
    /**
     * Ensure provider is ready for use
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error(`Provider ${this.id} is not initialized`);
        }
    }
}
exports.BaseProvider = BaseProvider;
