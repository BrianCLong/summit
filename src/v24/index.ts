// v24 IntelGraph Platform - Core Features and Ecosystem

export { V24Platform } from './platform';
export { IngestEngine } from './ingest/engine';
export { CacheOptimizer } from './optimization/cache-optimizer';
export { MultiRegionRouter } from './routing/multi-region';
export { PolicyEngine } from './policy/engine';
export { ObservabilityStack } from './observability/stack';
export { ResilienceFramework } from './resilience/framework';
export { DeveloperExperience } from './devex/developer-experience';

// Version info
export const VERSION = '24.0.0';
export const CODENAME = 'IntelGraph Platform';

// Feature flags
export const FEATURE_FLAGS = {
  coherence: true,
  multiRegion: false,
  advancedPolicy: true,
  chaosEngineering: true,
};
