"use strict";
/**
 * Cross-Border Module Configuration
 *
 * Environment-based configuration for cross-border assistant operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCrossBorderConfig = loadCrossBorderConfig;
exports.validateConfig = validateConfig;
exports.getCrossBorderConfig = getCrossBorderConfig;
/**
 * Load configuration from environment
 */
function loadCrossBorderConfig() {
    return {
        gateway: {
            nodeId: process.env.CROSS_BORDER_NODE_ID || 'intelgraph-primary',
            region: process.env.CROSS_BORDER_REGION || 'US',
            defaultLanguage: process.env.CROSS_BORDER_DEFAULT_LANG || 'en',
            maxConcurrentSessions: parseInt(process.env.CROSS_BORDER_MAX_SESSIONS || '1000', 10),
        },
        security: {
            encryptionEnabled: process.env.CROSS_BORDER_ENCRYPTION !== 'false',
            auditEnabled: process.env.CROSS_BORDER_AUDIT !== 'false',
            mtlsRequired: process.env.CROSS_BORDER_MTLS === 'true',
            tokenExpiryMs: parseInt(process.env.CROSS_BORDER_TOKEN_EXPIRY || '3600000', 10),
        },
        handover: {
            defaultTimeoutMs: parseInt(process.env.CROSS_BORDER_HANDOVER_TIMEOUT || '30000', 10),
            maxRetries: parseInt(process.env.CROSS_BORDER_MAX_RETRIES || '3', 10),
            contextSizeLimit: parseInt(process.env.CROSS_BORDER_CONTEXT_LIMIT || '32000', 10),
            sessionTtlHours: parseInt(process.env.CROSS_BORDER_SESSION_TTL || '24', 10),
        },
        healthCheck: {
            intervalMs: parseInt(process.env.CROSS_BORDER_HEALTH_INTERVAL || '30000', 10),
            timeoutMs: parseInt(process.env.CROSS_BORDER_HEALTH_TIMEOUT || '5000', 10),
            unhealthyThreshold: parseInt(process.env.CROSS_BORDER_UNHEALTHY_THRESHOLD || '3', 10),
        },
        rateLimit: {
            requestsPerMinute: parseInt(process.env.CROSS_BORDER_RATE_LIMIT || '100', 10),
            burstSize: parseInt(process.env.CROSS_BORDER_BURST_SIZE || '20', 10),
        },
        circuitBreaker: {
            failureThreshold: parseInt(process.env.CROSS_BORDER_CB_THRESHOLD || '5', 10),
            resetTimeoutMs: parseInt(process.env.CROSS_BORDER_CB_RESET || '60000', 10),
            halfOpenRequests: parseInt(process.env.CROSS_BORDER_CB_HALF_OPEN || '3', 10),
        },
        translation: {
            cacheEnabled: process.env.CROSS_BORDER_TRANSLATION_CACHE !== 'false',
            cacheTtlMs: parseInt(process.env.CROSS_BORDER_TRANSLATION_TTL || '3600000', 10),
            maxTextLength: parseInt(process.env.CROSS_BORDER_MAX_TEXT_LENGTH || '50000', 10),
        },
    };
}
/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    if (config.gateway.maxConcurrentSessions < 1) {
        errors.push('maxConcurrentSessions must be at least 1');
    }
    if (config.handover.defaultTimeoutMs < 1000) {
        errors.push('handover timeout must be at least 1000ms');
    }
    if (config.circuitBreaker.failureThreshold < 1) {
        errors.push('circuit breaker threshold must be at least 1');
    }
    if (config.rateLimit.requestsPerMinute < 1) {
        errors.push('rate limit must be at least 1 request per minute');
    }
    return errors;
}
// Singleton config instance
let configInstance = null;
function getCrossBorderConfig() {
    if (!configInstance) {
        configInstance = loadCrossBorderConfig();
        const errors = validateConfig(configInstance);
        if (errors.length > 0) {
            console.warn('Cross-border config validation warnings:', errors);
        }
    }
    return configInstance;
}
