// @ts-nocheck
import { provenanceLedger } from '../provenance/ledger';
import { ModelMetadata, ModelVersion } from './types';
import { logger } from '../config/logger';

/**
 * Registry for managing ML model lifecycles.
 * Uses ProvenanceLedger for immutable history and audit trails.
 */
export class ModelRegistry {
  private static instance: ModelRegistry;

  private constructor() {}

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Register a new model definition (without versions).
   */
  async registerModel(
    tenantId: string,
    model: Omit<ModelMetadata, 'versions' | 'id'>
  ): Promise<string> {
    const entry = await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'REGISTER_MODEL',
      resourceType: 'Model',
      resourceId: `model_${Date.now()}_${model.name}`,
      actorId: 'system',
      actorType: 'user',
      payload: { ...model, versions: [] },
      metadata: { domain: model.domain }
    });
    return entry.resourceId;
  }

  /**
   * Log a new version for an existing model.
   */
  async logModelVersion(
    tenantId: string,
    modelId: string,
    version: Omit<ModelVersion, 'createdAt'>
  ): Promise<void> {
    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'LOG_MODEL_VERSION',
      resourceType: 'ModelVersion',
      resourceId: `${modelId}:${version.version}`,
      actorId: 'system',
      actorType: 'user',
      payload: version,
      metadata: { modelId, version: version.version }
    });
  }

  /**
   * Update the stage of a model version (e.g., Staging -> Production).
   */
  async transitionModelVersionStage(
    tenantId: string,
    modelId: string,
    version: string,
    stage: ModelVersion['status']
  ): Promise<void> {
    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'TRANSITION_MODEL_STAGE',
      resourceType: 'ModelVersion',
      resourceId: `${modelId}:${version}`,
      actorId: 'system',
      actorType: 'user',
      payload: { stage },
      metadata: { modelId, version }
    });
  }

  /**
   * Get the latest version of a model that is in 'production'.
   */
  async getProductionModelVersion(
    tenantId: string,
    modelName: string
  ): Promise<ModelVersion | null> {
    try {
        // Retrieve entries related to transitioning to production
        const entries = await provenanceLedger.getEntries(tenantId, {
            actionType: 'TRANSITION_MODEL_STAGE',
            resourceType: 'ModelVersion',
            order: 'DESC',
            limit: 50 // Look at recent transitions
        });

        // Filter for the specific model and stage=production
        // Note: metadata.modelId usually stores the ID, but for this simplified lookup we assume we can match or payload has info
        const prodEntry = entries.find(e => {
            const payload = e.payload as any;
            const meta = e.metadata as any;
            return meta.modelId?.includes(modelName) && payload.stage === 'production';
        });

        if (prodEntry) {
             const version = (prodEntry.metadata as any).version;
             // Ideally we'd fetch the full version details, but for now return a stub with the version
             return {
                 version,
                 status: 'production',
                 description: 'Resolved from ledger',
                 tags: [],
                 metrics: {},
                 parameters: {},
                 artifacts: { path: '', format: 'tensorflow', size: 0, checksum: '' },
                 createdAt: prodEntry.timestamp,
                 createdBy: prodEntry.actorId
             };
        }
    } catch (e: any) {
        logger.error({ error: e }, 'Failed to resolve production model version');
    }
    return null;
  }
}

export const modelRegistry = ModelRegistry.getInstance();
