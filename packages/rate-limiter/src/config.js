"use strict";
/**
 * Rate Limiter Configuration
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.TIER_POLICIES = exports.ENDPOINT_POLICIES = exports.DEFAULT_POLICY = exports.TIER_LIMITS = void 0;
exports.getPolicyForEndpoint = getPolicyForEndpoint;
exports.validateConfig = validateConfig;
exports.loadConfigFromEnv = loadConfigFromEnv;
/**
 * Default tier limits based on user subscription level
 */
exports.TIER_LIMITS = {
    free: {
        tier: 'free',
        requestsPerMinute: 10,
        requestsPerHour: 500,
        burstSize: 15,
        graphqlComplexity: 100,
    },
    basic: {
        tier: 'basic',
        requestsPerMinute: 30,
        requestsPerHour: 1500,
        burstSize: 50,
        graphqlComplexity: 300,
    },
    premium: {
        tier: 'premium',
        requestsPerMinute: 100,
        requestsPerHour: 5000,
        burstSize: 150,
        graphqlComplexity: 1000,
    },
    enterprise: {
        tier: 'enterprise',
        requestsPerMinute: 500,
        requestsPerHour: 25000,
        burstSize: 1000,
        graphqlComplexity: 5000,
    },
    internal: {
        tier: 'internal',
        requestsPerMinute: 10000,
        requestsPerHour: 500000,
        burstSize: 10000,
        graphqlComplexity: 50000,
    },
};
/**
 * Default rate limit policy
 */
exports.DEFAULT_POLICY = {
    id: 'default',
    name: 'Default Rate Limit',
    description: 'Default rate limiting policy for all endpoints',
    algorithm: 'sliding-window',
    windowMs: 60000, // 1 minute
    max: 100,
    enabled: true,
};
/**
 * Endpoint-specific rate limit policies
 */
exports.ENDPOINT_POLICIES = {
    // Authentication endpoints - strict limits to prevent brute force
    '/auth/login': {
        algorithm: 'sliding-window',
        windowMs: 60000, // 1 minute
        max: 5,
        endpoints: ['/auth/login', '/auth/signin'],
    },
    '/auth/register': {
        algorithm: 'sliding-window',
        windowMs: 3600000, // 1 hour
        max: 3,
    },
    '/auth/reset-password': {
        algorithm: 'sliding-window',
        windowMs: 3600000, // 1 hour
        max: 3,
    },
    // GraphQL endpoint - token bucket for burst queries
    '/graphql': {
        algorithm: 'token-bucket',
        capacity: 100,
        refillRate: 10, // 10 tokens per second
    },
    // Ingest endpoint - higher limits for data upload
    '/api/ingest': {
        algorithm: 'sliding-window',
        windowMs: 60000, // 1 minute
        max: 50,
    },
    // Analytics endpoints - token bucket for burst analysis
    '/api/analytics': {
        algorithm: 'token-bucket',
        capacity: 100,
        refillRate: 5,
    },
    // Copilot/AI endpoints - strict limits due to cost
    '/api/copilot': {
        algorithm: 'sliding-window',
        windowMs: 60000, // 1 minute
        max: 20,
    },
    // Admin endpoints - internal tier only
    '/api/admin': {
        algorithm: 'sliding-window',
        windowMs: 60000,
        max: 1000,
        tiers: ['internal'],
    },
    // Evidence upload - moderate limits
    '/api/evidence': {
        algorithm: 'sliding-window',
        windowMs: 60000,
        max: 30,
    },
    // Triage queue - moderate limits
    '/api/triage': {
        algorithm: 'sliding-window',
        windowMs: 60000,
        max: 50,
    },
    // Cases API - standard limits
    '/api/cases': {
        algorithm: 'sliding-window',
        windowMs: 60000,
        max: 100,
    },
};
/**
 * Tier-specific policy overrides
 */
exports.TIER_POLICIES = {
    free: {
        windowMs: 60000,
        max: exports.TIER_LIMITS.free.requestsPerMinute,
        capacity: exports.TIER_LIMITS.free.burstSize,
    },
    basic: {
        windowMs: 60000,
        max: exports.TIER_LIMITS.basic.requestsPerMinute,
        capacity: exports.TIER_LIMITS.basic.burstSize,
    },
    premium: {
        windowMs: 60000,
        max: exports.TIER_LIMITS.premium.requestsPerMinute,
        capacity: exports.TIER_LIMITS.premium.burstSize,
    },
    enterprise: {
        windowMs: 60000,
        max: exports.TIER_LIMITS.enterprise.requestsPerMinute,
        capacity: exports.TIER_LIMITS.enterprise.burstSize,
    },
    internal: {
        windowMs: 60000,
        max: exports.TIER_LIMITS.internal.requestsPerMinute,
        capacity: exports.TIER_LIMITS.internal.burstSize,
    },
};
/**
 * Default rate limit configuration
 */
exports.DEFAULT_CONFIG = {
    defaultPolicy: exports.DEFAULT_POLICY,
    tierPolicies: exports.TIER_POLICIES,
    endpointPolicies: exports.ENDPOINT_POLICIES,
    global: {
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        keyPrefix: process.env.RATE_LIMIT_KEY_PREFIX || 'ratelimit:',
        enableMetrics: process.env.RATE_LIMIT_METRICS_ENABLED !== 'false',
        alertThreshold: parseFloat(process.env.RATE_LIMIT_ALERT_THRESHOLD || '0.9'),
    },
};
/**
 * Get rate limit policy for a specific endpoint and tier
 */
function getPolicyForEndpoint(endpoint, tier, config = exports.DEFAULT_CONFIG) {
    // Start with default policy
    let policy = { ...config.defaultPolicy };
    // Apply tier-specific policy
    if (tier && config.tierPolicies[tier]) {
        policy = { ...policy, ...config.tierPolicies[tier] };
    }
    // Apply endpoint-specific policy
    for (const [pattern, endpointPolicy] of Object.entries(config.endpointPolicies)) {
        if (endpoint.startsWith(pattern)) {
            // Check if tier is allowed for this endpoint
            if (endpointPolicy.tiers && tier && !endpointPolicy.tiers.includes(tier)) {
                continue;
            }
            policy = { ...policy, ...endpointPolicy };
            break;
        }
    }
    // Generate unique ID for this policy combination
    policy.id = `${endpoint}:${tier || 'default'}`;
    policy.name = `Rate limit for ${endpoint} (${tier || 'default'})`;
    return policy;
}
/**
 * Validate rate limit configuration
 */
function validateConfig(config) {
    const errors = [];
    // Validate default policy
    if (!config.defaultPolicy) {
        errors.push('Default policy is required');
    }
    if (config.defaultPolicy.windowMs <= 0) {
        errors.push('Window must be positive');
    }
    if (config.defaultPolicy.max <= 0) {
        errors.push('Max requests must be positive');
    }
    // Validate tier policies
    for (const [tier, policy] of Object.entries(config.tierPolicies)) {
        if (policy.max && policy.max <= 0) {
            errors.push(`Tier ${tier}: max requests must be positive`);
        }
        if (policy.windowMs && policy.windowMs <= 0) {
            errors.push(`Tier ${tier}: window must be positive`);
        }
    }
    // Validate endpoint policies
    for (const [endpoint, policy] of Object.entries(config.endpointPolicies)) {
        if (policy.max && policy.max <= 0) {
            errors.push(`Endpoint ${endpoint}: max requests must be positive`);
        }
        if (policy.windowMs && policy.windowMs <= 0) {
            errors.push(`Endpoint ${endpoint}: window must be positive`);
        }
        if (policy.algorithm === 'token-bucket') {
            if (!policy.capacity || policy.capacity <= 0) {
                errors.push(`Endpoint ${endpoint}: capacity must be positive for token bucket`);
            }
            if (!policy.refillRate || policy.refillRate <= 0) {
                errors.push(`Endpoint ${endpoint}: refill rate must be positive for token bucket`);
            }
        }
    }
    return errors;
}
/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv() {
    const config = {};
    if (process.env.RATE_LIMIT_ALGORITHM) {
        config.defaultPolicy = {
            ...exports.DEFAULT_POLICY,
            algorithm: process.env.RATE_LIMIT_ALGORITHM,
        };
    }
    if (process.env.RATE_LIMIT_WINDOW_MS) {
        const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS);
        if (!isNaN(windowMs)) {
            config.defaultPolicy = {
                ...exports.DEFAULT_POLICY,
                ...config.defaultPolicy,
                windowMs,
            };
        }
    }
    if (process.env.RATE_LIMIT_MAX_REQUESTS) {
        const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS);
        if (!isNaN(max)) {
            config.defaultPolicy = {
                ...exports.DEFAULT_POLICY,
                ...config.defaultPolicy,
                max,
            };
        }
    }
    return config;
}
