"use strict";
// @ts-nocheck
/**
 * Feature Flags Setup for Summit Server
 *
 * Initializes feature flags with LaunchDarkly/Unleash/Postgres and Redis caching
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFeatureFlags = initializeFeatureFlags;
exports.getFeatureFlagService = getFeatureFlagService;
exports.closeFeatureFlags = closeFeatureFlags;
const feature_flags_1 = require("@intelgraph/feature-flags");
const PostgresProvider_js_1 = require("./PostgresProvider.js");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
let featureFlagService = null;
/**
 * Initialize feature flag service
 */
async function initializeFeatureFlags() {
    if (featureFlagService) {
        return featureFlagService;
    }
    try {
        logger_js_1.default.info('Initializing feature flag service...');
        // Determine which provider to use
        const providerType = process.env.FEATURE_FLAG_PROVIDER || 'launchdarkly';
        // Initialize provider
        let provider;
        if (providerType === 'launchdarkly') {
            if (!process.env.LAUNCHDARKLY_SDK_KEY) {
                throw new Error('LAUNCHDARKLY_SDK_KEY is required');
            }
            provider = new feature_flags_1.LaunchDarklyProvider({
                sdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
                options: {
                    diagnosticOptOut: process.env.NODE_ENV === 'production',
                },
            });
        }
        else if (providerType === 'unleash') {
            if (!process.env.UNLEASH_URL || !process.env.UNLEASH_APP_NAME) {
                throw new Error('UNLEASH_URL and UNLEASH_APP_NAME are required');
            }
            provider = new feature_flags_1.UnleashProvider({
                url: process.env.UNLEASH_URL,
                appName: process.env.UNLEASH_APP_NAME,
                apiToken: process.env.UNLEASH_API_TOKEN,
                instanceId: process.env.HOSTNAME || 'server',
            });
        }
        else if (providerType === 'postgres') {
            provider = new PostgresProvider_js_1.PostgresProvider();
        }
        else {
            throw new Error(`Unknown feature flag provider: ${providerType}`);
        }
        // Initialize Redis cache
        let cache;
        if (process.env.REDIS_URL && providerType !== 'postgres') {
            // Postgres provider has built-in caching and sync, so we might not need external cache layer
            // But keeping it consistent if needed.
            // Actually PostgresProvider implements its own caching to avoid double caching complexity
            // We only use RedisCache for external providers like LD/Unleash if needed.
            const redis = new ioredis_1.default(process.env.REDIS_URL, {
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
            });
            cache = new feature_flags_1.RedisCache({
                redis,
                keyPrefix: 'ff:',
                defaultTTL: parseInt(process.env.FEATURE_FLAG_CACHE_TTL || '300'),
                enableStats: true,
            });
            logger_js_1.default.info('Feature flag Redis cache initialized');
        }
        // Initialize metrics
        const metrics = new feature_flags_1.PrometheusMetrics({
            prefix: 'summit_feature_flags_',
            enableDefaultMetrics: true,
        });
        // Create service
        featureFlagService = new feature_flags_1.FeatureFlagService({
            provider,
            cache,
            enableCache: !!cache,
            enableMetrics: true,
            enableAnalytics: true,
            cacheTTL: parseInt(process.env.FEATURE_FLAG_CACHE_TTL || '300'),
            defaultContext: {
                environment: process.env.NODE_ENV || 'development',
            },
        });
        // Set metrics
        featureFlagService.setMetrics(metrics);
        // Set up event listeners
        featureFlagService.on('ready', () => {
            logger_js_1.default.info('Feature flag service ready', {
                provider: provider.name,
                cacheEnabled: !!cache,
            });
        });
        featureFlagService.on('error', (error) => {
            logger_js_1.default.error('Feature flag service error', {
                error: error.message,
                stack: error.stack,
            });
        });
        // Initialize
        if (process.env.NODE_ENV !== 'test') {
            await featureFlagService.initialize();
            logger_js_1.default.info('Feature flag service initialized successfully');
        }
        else {
            logger_js_1.default.info('Skipping feature flag service initialization in test environment');
            // Set as ready immediately for tests
            setTimeout(() => featureFlagService.emit('ready'), 0);
        }
        return featureFlagService;
    }
    catch (error) {
        logger_js_1.default.error('Failed to initialize feature flag service', {
            error: error.message,
        });
        throw error;
    }
}
/**
 * Get feature flag service instance
 */
function getFeatureFlagService() {
    if (!featureFlagService) {
        throw new Error('Feature flag service not initialized');
    }
    return featureFlagService;
}
/**
 * Close feature flag service
 */
async function closeFeatureFlags() {
    if (featureFlagService) {
        await featureFlagService.close();
        featureFlagService = null;
        logger_js_1.default.info('Feature flag service closed');
    }
}
