/**
 * @intelgraph/feature-store
 * Feature Store with online/offline serving, versioning, and lineage tracking
 */

export * from './types.js';
export * from './store/FeatureStore.js';

import { FeatureStore } from './store/FeatureStore.js';
import { FeatureStoreConfig } from './types.js';

/**
 * Factory function to create a FeatureStore
 */
export function createFeatureStore(config: FeatureStoreConfig): FeatureStore {
  return new FeatureStore(config);
}
