
import { logger } from '../../config/logger.js';
import { getPostgresPool } from '../../db/postgres.js';

export type ModelState = 'TRAINING' | 'EVALUATING' | 'READY' | 'DEPLOYED' | 'ARCHIVED' | 'FAILED';

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  state: ModelState;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  biasScore: number; // 0 to 1, where 0 is no bias
  lastRetrainedAt?: string;
}

/**
 * Service for Model Lifecycle Automation (Task #102).
 */
export class ModelLifecycleService {
  private static instance: ModelLifecycleService;

  private constructor() {}

  public static getInstance(): ModelLifecycleService {
    if (!ModelLifecycleService.instance) {
      ModelLifecycleService.instance = new ModelLifecycleService();
    }
    return ModelLifecycleService.instance;
  }

  /**
   * Registers a new model version.
   */
  public async registerModel(model: ModelMetadata): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO ai_models (id, name, version, state, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET version = $3, state = $4, metadata = $5, updated_at = NOW()`,
      [model.id, model.name, model.version, model.state, JSON.stringify(model)]
    );
    logger.info({ modelId: model.id, version: model.version }, 'Model registered successfully');
  }

  /**
   * Promotes a model to DEPLOYED state.
   */
  public async deployModel(modelId: string): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      "UPDATE ai_models SET state = 'DEPLOYED', updated_at = NOW() WHERE id = $1",
      [modelId]
    );
    logger.info({ modelId }, 'Model promoted to DEPLOYED');
  }

  /**
   * Triggers a simulated retraining process.
   */
  public async triggerRetraining(modelId: string, reason: string): Promise<void> {
    logger.warn({ modelId, reason }, 'Model retraining triggered');
    const pool = getPostgresPool();
    await pool.query(
      "UPDATE ai_models SET state = 'TRAINING', last_retrained_at = NOW(), updated_at = NOW() WHERE id = $1",
      [modelId]
    );
    // In a real system, this would send a message to a training pipeline (e.g. SageMaker, Vertex AI)
  }
}

export const modelLifecycleService = ModelLifecycleService.getInstance();
