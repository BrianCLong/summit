/**
 * Feature Flags Setup for Summit Server
 *
 * Initializes feature flags with LaunchDarkly/Unleash and Redis caching
 */

import {
  FeatureFlagService,
  LaunchDarklyProvider,
  UnleashProvider,
  RedisCache,
  PrometheusMetrics,
} from '@intelgraph/feature-flags';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

let featureFlagService: FeatureFlagService | null = null;

/**
 * Initialize feature flag service
 */
export async function initializeFeatureFlags(): Promise<FeatureFlagService> {
  if (featureFlagService) {
    return featureFlagService;
  }

  try {
    logger.info('Initializing feature flag service...');

    // Determine which provider to use
    const providerType = process.env.FEATURE_FLAG_PROVIDER || 'launchdarkly';

    // Initialize provider
    let provider;
    if (providerType === 'launchdarkly') {
      if (!process.env.LAUNCHDARKLY_SDK_KEY) {
        throw new Error('LAUNCHDARKLY_SDK_KEY is required');
      }

      provider = new LaunchDarklyProvider({
        sdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
        options: {
          diagnosticOptOut: process.env.NODE_ENV === 'production',
        },
      });
    } else if (providerType === 'unleash') {
      if (!process.env.UNLEASH_URL || !process.env.UNLEASH_APP_NAME) {
        throw new Error('UNLEASH_URL and UNLEASH_APP_NAME are required');
      }

      provider = new UnleashProvider({
        url: process.env.UNLEASH_URL,
        appName: process.env.UNLEASH_APP_NAME,
        apiToken: process.env.UNLEASH_API_TOKEN,
        instanceId: process.env.HOSTNAME || 'server',
      });
    } else {
      throw new Error(`Unknown feature flag provider: ${providerType}`);
    }

    // Initialize Redis cache
    let cache;
    if (process.env.REDIS_URL) {
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      cache = new RedisCache({
        redis,
        keyPrefix: 'ff:',
        defaultTTL: parseInt(process.env.FEATURE_FLAG_CACHE_TTL || '300'),
        enableStats: true,
      });

      logger.info('Feature flag Redis cache initialized');
    }

    // Initialize metrics
    const metrics = new PrometheusMetrics({
      prefix: 'summit_feature_flags_',
      enableDefaultMetrics: true,
    });

    // Create service
    featureFlagService = new FeatureFlagService({
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
      logger.info('Feature flag service ready', {
        provider: provider.name,
        cacheEnabled: !!cache,
      });
    });

    featureFlagService.on('error', (error) => {
      logger.error('Feature flag service error', {
        error: error.message,
        stack: error.stack,
      });
    });

    // Initialize
    await featureFlagService.initialize();

    logger.info('Feature flag service initialized successfully');

    return featureFlagService;
  } catch (error) {
    logger.error('Failed to initialize feature flag service', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Get feature flag service instance
 */
export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagService) {
    throw new Error('Feature flag service not initialized');
  }
  return featureFlagService;
}

/**
 * Close feature flag service
 */
export async function closeFeatureFlags(): Promise<void> {
  if (featureFlagService) {
    await featureFlagService.close();
    featureFlagService = null;
    logger.info('Feature flag service closed');
  }
}
