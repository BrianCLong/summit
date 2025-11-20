/**
 * MLOps Platform
 * Comprehensive machine learning operations platform
 */

// Export types
export * from './types/index.js';

// Export core classes
export { ModelRegistry } from './core/ModelRegistry.js';
export { TrainingOrchestrator } from './core/TrainingOrchestrator.js';
export { FeatureStore } from './core/FeatureStore.js';

// Export interfaces
export type {
  ModelRegistryConfig,
  ModelSearchQuery,
} from './core/ModelRegistry.js';

export type {
  ResourceAllocation,
  TrainingJob,
} from './core/TrainingOrchestrator.js';

export type {
  FeatureValue,
  FeatureVector,
  PointInTimeQuery,
} from './core/FeatureStore.js';
