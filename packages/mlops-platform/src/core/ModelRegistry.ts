/**
 * Model Registry
 * Central registry for ML models with versioning and metadata management
 */

import { ModelMetadata, ModelStatus } from '../types/index.js';
import { EventEmitter } from 'events';

export interface ModelRegistryConfig {
  backend: 'postgresql' | 'mongodb' | 's3';
  connectionString: string;
  artifactStore: {
    type: 's3' | 'gcs' | 'azure-blob' | 'local';
    bucket?: string;
    path?: string;
  };
}

export interface ModelSearchQuery {
  name?: string;
  framework?: string;
  type?: string;
  status?: ModelStatus;
  tags?: string[];
  author?: string;
  minVersion?: string;
  maxVersion?: string;
}

export class ModelRegistry extends EventEmitter {
  private config: ModelRegistryConfig;
  private models: Map<string, ModelMetadata>;

  constructor(config: ModelRegistryConfig) {
    super();
    this.config = config;
    this.models = new Map();
  }

  /**
   * Register a new model
   */
  async registerModel(metadata: Omit<ModelMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelMetadata> {
    const id = this.generateModelId();
    const now = new Date();

    const model: ModelMetadata = {
      ...metadata,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.models.set(id, model);
    this.emit('model:registered', model);

    return model;
  }

  /**
   * Get model by ID
   */
  async getModel(id: string): Promise<ModelMetadata | null> {
    return this.models.get(id) || null;
  }

  /**
   * Get model by name and version
   */
  async getModelByVersion(name: string, version: string): Promise<ModelMetadata | null> {
    for (const model of this.models.values()) {
      if (model.name === name && model.version === version) {
        return model;
      }
    }
    return null;
  }

  /**
   * List all versions of a model
   */
  async listModelVersions(name: string): Promise<ModelMetadata[]> {
    const versions: ModelMetadata[] = [];
    for (const model of this.models.values()) {
      if (model.name === name) {
        versions.push(model);
      }
    }
    return versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Search models
   */
  async searchModels(query: ModelSearchQuery): Promise<ModelMetadata[]> {
    let results = Array.from(this.models.values());

    if (query.name) {
      results = results.filter(m => m.name.includes(query.name!));
    }

    if (query.framework) {
      results = results.filter(m => m.framework === query.framework);
    }

    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.status) {
      results = results.filter(m => m.status === query.status);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        query.tags!.some(tag => m.tags.includes(tag))
      );
    }

    if (query.author) {
      results = results.filter(m => m.author === query.author);
    }

    return results;
  }

  /**
   * Update model metadata
   */
  async updateModel(id: string, updates: Partial<ModelMetadata>): Promise<ModelMetadata | null> {
    const model = this.models.get(id);
    if (!model) {
      return null;
    }

    const updated = {
      ...model,
      ...updates,
      id: model.id, // Preserve ID
      createdAt: model.createdAt, // Preserve creation time
      updatedAt: new Date(),
    };

    this.models.set(id, updated);
    this.emit('model:updated', updated);

    return updated;
  }

  /**
   * Update model status
   */
  async updateModelStatus(id: string, status: ModelStatus): Promise<ModelMetadata | null> {
    return this.updateModel(id, { status });
  }

  /**
   * Add deployment to model
   */
  async addDeployment(
    id: string,
    deployment: {
      environment: string;
      endpoint: string;
      status: string;
    }
  ): Promise<ModelMetadata | null> {
    const model = this.models.get(id);
    if (!model) {
      return null;
    }

    const deployments = [
      ...model.deployments,
      {
        ...deployment,
        deployedAt: new Date(),
      },
    ];

    return this.updateModel(id, { deployments });
  }

  /**
   * Delete model
   */
  async deleteModel(id: string): Promise<boolean> {
    const model = this.models.get(id);
    if (!model) {
      return false;
    }

    this.models.delete(id);
    this.emit('model:deleted', model);

    return true;
  }

  /**
   * Get model lineage
   */
  async getModelLineage(id: string): Promise<{
    model: ModelMetadata;
    predecessors: ModelMetadata[];
    successors: ModelMetadata[];
  } | null> {
    const model = this.models.get(id);
    if (!model) {
      return null;
    }

    // In a real implementation, this would track parent-child relationships
    return {
      model,
      predecessors: [],
      successors: [],
    };
  }

  /**
   * Validate model artifact
   */
  async validateArtifact(id: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const model = this.models.get(id);
    if (!model) {
      return {
        valid: false,
        errors: ['Model not found'],
      };
    }

    const errors: string[] = [];

    // Check artifact exists
    if (!model.artifactUri) {
      errors.push('Artifact URI not specified');
    }

    // Check checksum
    if (!model.checksum) {
      errors.push('Checksum not available');
    }

    // In a real implementation, would verify artifact integrity
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compare model versions
   */
  async compareVersions(id1: string, id2: string): Promise<{
    model1: ModelMetadata;
    model2: ModelMetadata;
    differences: {
      field: string;
      value1: any;
      value2: any;
    }[];
    metricsDiff: Record<string, number>;
  } | null> {
    const model1 = this.models.get(id1);
    const model2 = this.models.get(id2);

    if (!model1 || !model2) {
      return null;
    }

    const differences: { field: string; value1: any; value2: any }[] = [];

    // Compare key fields
    const fieldsToCompare: (keyof ModelMetadata)[] = [
      'framework',
      'type',
      'status',
      'size',
    ];

    for (const field of fieldsToCompare) {
      if (model1[field] !== model2[field]) {
        differences.push({
          field,
          value1: model1[field],
          value2: model2[field],
        });
      }
    }

    // Compare metrics
    const metricsDiff: Record<string, number> = {};
    if (model1.metrics && model2.metrics) {
      const allMetrics = new Set([
        ...Object.keys(model1.metrics),
        ...Object.keys(model2.metrics),
      ]);

      for (const metric of allMetrics) {
        const val1 = model1.metrics[metric] || 0;
        const val2 = model2.metrics[metric] || 0;
        metricsDiff[metric] = val2 - val1;
      }
    }

    return {
      model1,
      model2,
      differences,
      metricsDiff,
    };
  }

  /**
   * Get production models
   */
  async getProductionModels(): Promise<ModelMetadata[]> {
    return Array.from(this.models.values()).filter(
      m => m.status === 'production'
    );
  }

  /**
   * Archive old models
   */
  async archiveOldModels(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let archivedCount = 0;

    for (const model of this.models.values()) {
      if (
        model.createdAt < cutoffDate &&
        model.status !== 'production' &&
        model.status !== 'staging'
      ) {
        await this.updateModelStatus(model.id, 'archived');
        archivedCount++;
      }
    }

    return archivedCount;
  }

  private generateModelId(): string {
    return `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
