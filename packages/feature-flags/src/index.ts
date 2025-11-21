/**
 * Feature Flags Package
 *
 * Comprehensive feature flag system with provider abstraction,
 * caching, analytics, and React integration
 */

// Core exports
export * from './types.js';
export * from './FeatureFlagService.js';

// Cache exports
export * from './cache/RedisCache.js';

// Metrics exports
export * from './metrics/PrometheusMetrics.js';

// Provider exports
export * from './providers/LaunchDarklyProvider.js';
export * from './providers/UnleashProvider.js';

// Utility exports
export * from './utils/rollout.js';
export * from './utils/targeting.js';

// Re-export commonly used types
export type {
  FeatureFlagProvider,
  FlagCache,
  FlagContext,
  FlagEvaluation,
  FlagDefinition,
  FlagMetrics,
  FeatureFlagConfig,
} from './types.js';
