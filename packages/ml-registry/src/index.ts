/**
 * @intelgraph/ml-registry
 * ML Model Registry with versioning, lineage tracking, and lifecycle management
 */

export * from './types.js';
export * from './registry/ModelRegistry.js';
export * from './lineage/LineageTracker.js';
export * from './artifacts/ArtifactStore.js';
export * from './comparison/ModelComparator.js';
export * from './stages/StageManager.js';

import { Pool } from 'pg';
import { ModelRegistry } from './registry/ModelRegistry.js';
import { LineageTracker } from './lineage/LineageTracker.js';
import { ArtifactStore } from './artifacts/ArtifactStore.js';
import { ModelComparator } from './comparison/ModelComparator.js';
import { StageManager } from './stages/StageManager.js';
import { ModelRegistryConfig } from './types.js';

/**
 * Complete ML Registry Service
 */
export class MLRegistryService {
  public registry: ModelRegistry;
  public lineage: LineageTracker;
  public artifacts: ArtifactStore;
  public comparator: ModelComparator;
  public stages: StageManager;

  private pool: Pool;

  constructor(config: ModelRegistryConfig) {
    this.registry = new ModelRegistry(config);

    // Share the pool from ModelRegistry
    this.pool = (this.registry as any).pool;

    this.lineage = new LineageTracker(this.pool);
    this.artifacts = new ArtifactStore(this.pool, config);
    this.comparator = new ModelComparator(this.pool);
    this.stages = new StageManager(this.pool);
  }

  /**
   * Initialize all registry components
   */
  async initialize(): Promise<void> {
    await this.registry.initialize();
    await this.lineage.initialize();
    await this.artifacts.initialize();
    await this.comparator.initialize();
    await this.stages.initialize();
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.registry.close();
  }
}

/**
 * Factory function to create an MLRegistryService
 */
export function createMLRegistry(config: ModelRegistryConfig): MLRegistryService {
  return new MLRegistryService(config);
}
