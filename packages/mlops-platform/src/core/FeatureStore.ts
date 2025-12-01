/**
 * Feature Store
 * Online and offline feature storage with versioning and lineage tracking
 */

import { Feature, FeatureStoreConfig, FeatureType } from '../types/index.js';
import { EventEmitter } from 'events';

export interface FeatureValue {
  featureId: string;
  entityId: string;
  value: any;
  timestamp: Date;
  version: number;
}

export interface FeatureVector {
  entityId: string;
  features: Record<string, any>;
  timestamp: Date;
}

export interface PointInTimeQuery {
  entityIds: string[];
  featureNames: string[];
  timestamp: Date;
}

export class FeatureStore extends EventEmitter {
  private config: FeatureStoreConfig;
  private features: Map<string, Feature>;
  private onlineStore: Map<string, FeatureValue[]>; // entityId -> values
  private offlineStore: Map<string, FeatureValue[]>; // for historical data

  constructor(config: FeatureStoreConfig) {
    super();
    this.config = config;
    this.features = new Map();
    this.onlineStore = new Map();
    this.offlineStore = new Map();
  }

  /**
   * Register a feature
   */
  async registerFeature(feature: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feature> {
    const id = this.generateFeatureId();
    const now = new Date();

    const fullFeature: Feature = {
      ...feature,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.features.set(id, fullFeature);
    this.emit('feature:registered', fullFeature);

    return fullFeature;
  }

  /**
   * Get feature definition
   */
  async getFeature(id: string): Promise<Feature | null> {
    return this.features.get(id) || null;
  }

  /**
   * Get feature by name
   */
  async getFeatureByName(name: string): Promise<Feature | null> {
    for (const feature of this.features.values()) {
      if (feature.name === name) {
        return feature;
      }
    }
    return null;
  }

  /**
   * List features in a feature group
   */
  async listFeatureGroup(groupName: string): Promise<Feature[]> {
    return Array.from(this.features.values()).filter(
      f => f.featureGroup === groupName
    );
  }

  /**
   * Write feature value to online store
   */
  async writeOnline(
    entityId: string,
    featureId: string,
    value: any,
    timestamp?: Date
  ): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const featureValue: FeatureValue = {
      featureId,
      entityId,
      value,
      timestamp: timestamp || new Date(),
      version: feature.version,
    };

    const key = this.getOnlineKey(entityId, featureId);
    const existing = this.onlineStore.get(key) || [];
    existing.push(featureValue);

    // Apply TTL if configured
    if (this.config.online.ttl) {
      const cutoff = new Date(Date.now() - this.config.online.ttl * 1000);
      const filtered = existing.filter(v => v.timestamp > cutoff);
      this.onlineStore.set(key, filtered);
    } else {
      // Keep only latest value
      this.onlineStore.set(key, [featureValue]);
    }

    this.emit('feature:written', { entityId, featureId, value });
  }

  /**
   * Write feature value to offline store
   */
  async writeOffline(
    entityId: string,
    featureId: string,
    value: any,
    timestamp: Date
  ): Promise<void> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const featureValue: FeatureValue = {
      featureId,
      entityId,
      value,
      timestamp,
      version: feature.version,
    };

    const key = this.getOfflineKey(entityId, featureId);
    const existing = this.offlineStore.get(key) || [];
    existing.push(featureValue);
    this.offlineStore.set(key, existing);

    this.emit('feature:written-offline', { entityId, featureId, value, timestamp });
  }

  /**
   * Read latest feature value from online store
   */
  async readOnline(entityId: string, featureId: string): Promise<any> {
    const key = this.getOnlineKey(entityId, featureId);
    const values = this.onlineStore.get(key);

    if (!values || values.length === 0) {
      return null;
    }

    // Return latest value
    return values[values.length - 1].value;
  }

  /**
   * Read feature vector (multiple features for an entity)
   */
  async readFeatureVector(
    entityId: string,
    featureIds: string[]
  ): Promise<FeatureVector> {
    const features: Record<string, any> = {};

    for (const featureId of featureIds) {
      const value = await this.readOnline(entityId, featureId);
      const feature = this.features.get(featureId);
      if (feature) {
        features[feature.name] = value;
      }
    }

    return {
      entityId,
      features,
      timestamp: new Date(),
    };
  }

  /**
   * Point-in-time query for historical features
   */
  async pointInTimeQuery(query: PointInTimeQuery): Promise<FeatureVector[]> {
    const results: FeatureVector[] = [];

    for (const entityId of query.entityIds) {
      const features: Record<string, any> = {};

      for (const featureName of query.featureNames) {
        const feature = await this.getFeatureByName(featureName);
        if (!feature) continue;

        const key = this.getOfflineKey(entityId, feature.id);
        const values = this.offlineStore.get(key) || [];

        // Find value closest to but not after query timestamp
        const relevantValues = values
          .filter(v => v.timestamp <= query.timestamp)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        if (relevantValues.length > 0) {
          features[featureName] = relevantValues[0].value;
        }
      }

      results.push({
        entityId,
        features,
        timestamp: query.timestamp,
      });
    }

    return results;
  }

  /**
   * Batch write features
   */
  async batchWrite(
    writes: Array<{
      entityId: string;
      features: Record<string, any>;
      timestamp?: Date;
    }>
  ): Promise<void> {
    for (const write of writes) {
      for (const [featureName, value] of Object.entries(write.features)) {
        const feature = await this.getFeatureByName(featureName);
        if (feature) {
          await this.writeOnline(write.entityId, feature.id, value, write.timestamp);
          if (this.config.offline.enabled) {
            await this.writeOffline(
              write.entityId,
              feature.id,
              value,
              write.timestamp || new Date()
            );
          }
        }
      }
    }
  }

  /**
   * Batch read features
   */
  async batchRead(
    entityIds: string[],
    featureIds: string[]
  ): Promise<FeatureVector[]> {
    const results: FeatureVector[] = [];

    for (const entityId of entityIds) {
      const vector = await this.readFeatureVector(entityId, featureIds);
      results.push(vector);
    }

    return results;
  }

  /**
   * Compute feature statistics
   */
  async computeStatistics(featureId: string): Promise<Feature['statistics']> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    const allValues: number[] = [];

    // Collect all values from offline store
    for (const values of this.offlineStore.values()) {
      const featureValues = values
        .filter(v => v.featureId === featureId)
        .map(v => v.value);
      allValues.push(...featureValues.filter(v => typeof v === 'number'));
    }

    if (allValues.length === 0) {
      return undefined;
    }

    const sorted = allValues.sort((a, b) => a - b);
    const sum = allValues.reduce((a, b) => a + b, 0);
    const mean = sum / allValues.length;

    const variance =
      allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      allValues.length;
    const stddev = Math.sqrt(variance);

    const statistics = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      stddev,
      distinctCount: new Set(allValues).size,
    };

    // Update feature with statistics
    await this.updateFeature(featureId, { statistics });

    return statistics;
  }

  /**
   * Materialize features
   */
  async materializeFeatures(
    featureGroupName: string,
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    const features = await this.listFeatureGroup(featureGroupName);

    this.emit('materialization:started', {
      featureGroup: featureGroupName,
      featureCount: features.length,
    });

    // In a real implementation, this would:
    // 1. Query the data sources
    // 2. Apply transformations
    // 3. Write to offline store
    // 4. Update online store if needed

    this.emit('materialization:completed', {
      featureGroup: featureGroupName,
    });
  }

  /**
   * Validate feature constraints
   */
  async validateConstraints(
    featureId: string,
    value: any
  ): Promise<{ valid: boolean; violations: string[] }> {
    const feature = this.features.get(featureId);
    if (!feature) {
      return { valid: false, violations: ['Feature not found'] };
    }

    const violations: string[] = [];

    for (const constraint of feature.constraints) {
      switch (constraint.type) {
        case 'range':
          if (
            typeof value === 'number' &&
            (value < constraint.config.min || value > constraint.config.max)
          ) {
            violations.push(
              `Value ${value} outside range [${constraint.config.min}, ${constraint.config.max}]`
            );
          }
          break;

        case 'not-null':
          if (value === null || value === undefined) {
            violations.push('Value cannot be null');
          }
          break;

        case 'enum':
          if (!constraint.config.values.includes(value)) {
            violations.push(
              `Value ${value} not in allowed values: ${constraint.config.values.join(', ')}`
            );
          }
          break;
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Get feature lineage
   */
  async getFeatureLineage(featureId: string): Promise<{
    feature: Feature;
    dependencies: Feature[];
    dependents: Feature[];
  } | null> {
    const feature = this.features.get(featureId);
    if (!feature) {
      return null;
    }

    // In a real implementation, this would track feature dependencies
    return {
      feature,
      dependencies: [],
      dependents: [],
    };
  }

  /**
   * Update feature
   */
  async updateFeature(
    id: string,
    updates: Partial<Feature>
  ): Promise<Feature | null> {
    const feature = this.features.get(id);
    if (!feature) {
      return null;
    }

    const updated = {
      ...feature,
      ...updates,
      id: feature.id,
      createdAt: feature.createdAt,
      updatedAt: new Date(),
    };

    this.features.set(id, updated);
    this.emit('feature:updated', updated);

    return updated;
  }

  /**
   * Delete feature
   */
  async deleteFeature(id: string): Promise<boolean> {
    const feature = this.features.get(id);
    if (!feature) {
      return false;
    }

    this.features.delete(id);

    // Clean up stores
    const keysToDelete: string[] = [];
    for (const key of this.onlineStore.keys()) {
      if (key.includes(id)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.onlineStore.delete(key));

    this.emit('feature:deleted', feature);

    return true;
  }

  private getOnlineKey(entityId: string, featureId: string): string {
    return `${entityId}:${featureId}`;
  }

  private getOfflineKey(entityId: string, featureId: string): string {
    return `${entityId}:${featureId}`;
  }

  private generateFeatureId(): string {
    return `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
