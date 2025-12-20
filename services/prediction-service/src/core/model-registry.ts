/**
 * Model Registry - Model Lifecycle Management
 */

import type { ModelMetadata } from '../types/index.js';

export interface ModelVersion {
  version: string;
  model: any;
  metadata: ModelMetadata;
  deployedAt: Date;
  performance: Record<string, number>;
}

export interface DriftMetrics {
  dataDrift: number;
  conceptDrift: number;
  performanceDrift: number;
  timestamp: Date;
}

export class ModelRegistry {
  private models: Map<string, ModelVersion[]> = new Map();
  private championModels: Map<string, string> = new Map(); // modelId -> version
  private driftHistory: Map<string, DriftMetrics[]> = new Map();

  /**
   * Register a new model version
   */
  registerVersion(modelId: string, version: ModelVersion): void {
    if (!this.models.has(modelId)) {
      this.models.set(modelId, []);
    }

    const versions = this.models.get(modelId)!;
    versions.push(version);

    // Set as champion if first version
    if (versions.length === 1) {
      this.championModels.set(modelId, version.version);
    }
  }

  /**
   * Get champion (production) model
   */
  getChampion(modelId: string): ModelVersion | undefined {
    const championVersion = this.championModels.get(modelId);
    if (!championVersion) return undefined;

    const versions = this.models.get(modelId);
    return versions?.find(v => v.version === championVersion);
  }

  /**
   * Get specific model version
   */
  getVersion(modelId: string, version: string): ModelVersion | undefined {
    const versions = this.models.get(modelId);
    return versions?.find(v => v.version === version);
  }

  /**
   * List all versions of a model
   */
  listVersions(modelId: string): ModelVersion[] {
    return this.models.get(modelId) || [];
  }

  /**
   * Promote challenger to champion
   */
  promoteToChampion(modelId: string, version: string): void {
    const modelVersion = this.getVersion(modelId, version);
    if (!modelVersion) {
      throw new Error(`Model version not found: ${modelId}@${version}`);
    }

    this.championModels.set(modelId, version);
  }

  /**
   * Record drift metrics
   */
  recordDrift(modelId: string, metrics: DriftMetrics): void {
    if (!this.driftHistory.has(modelId)) {
      this.driftHistory.set(modelId, []);
    }

    this.driftHistory.get(modelId)!.push(metrics);

    // Alert if drift is too high
    if (metrics.dataDrift > 0.25 || metrics.conceptDrift > 0.25) {
      console.warn(`High drift detected for model ${modelId}`, metrics);
    }
  }

  /**
   * Get drift history
   */
  getDriftHistory(modelId: string): DriftMetrics[] {
    return this.driftHistory.get(modelId) || [];
  }

  /**
   * Check if retraining is needed
   */
  needsRetraining(modelId: string): boolean {
    const driftHistory = this.getDriftHistory(modelId);
    if (driftHistory.length === 0) return false;

    const latestDrift = driftHistory[driftHistory.length - 1];
    return latestDrift.dataDrift > 0.25 ||
           latestDrift.conceptDrift > 0.25 ||
           latestDrift.performanceDrift > 0.15;
  }
}
