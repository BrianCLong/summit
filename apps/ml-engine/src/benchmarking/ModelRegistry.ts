import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { ModelVersion, TrainingMetrics } from '../training/TrainingPipeline.js';

interface RegisterOptions {
  metrics?: Partial<TrainingMetrics>;
  hyperparameters?: Record<string, any>;
  modelPath?: string;
  notes?: string;
  activate?: boolean;
}

export class ModelRegistry {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query('SELECT 1');
    this.initialized = true;
  }

  async ensureRegistered(
    modelType: string,
    version: string,
    options: RegisterOptions = {},
  ): Promise<ModelVersion> {
    await this.initialize();

    const existing = await this.pool.query(
      `
        SELECT * FROM ml_model_versions
        WHERE model_type = $1 AND version = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [modelType, version],
    );

    if (existing.rowCount > 0) {
      const row = existing.rows[0];
      if (options.activate) {
        await this.setActive(row.id);
      }
      return this.mapRow(row);
    }

    const id = randomUUID();
    const result = await this.pool.query(
      `
        INSERT INTO ml_model_versions (
          id,
          version,
          model_type,
          metrics,
          is_active,
          created_at,
          model_path,
          hyperparameters,
          notes
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8)
        RETURNING *
      `,
      [
        id,
        version,
        modelType,
        JSON.stringify(options.metrics ?? {}),
        options.activate ?? false,
        options.modelPath ?? 'external',
        JSON.stringify(options.hyperparameters ?? {}),
        options.notes ?? null,
      ],
    );

    const model = this.mapRow(result.rows[0]);
    logger.info('Registered new model version', {
      modelType,
      version,
      modelVersionId: model.id,
    });
    return model;
  }

  async setActive(modelVersionId: string): Promise<void> {
    await this.initialize();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT model_type FROM ml_model_versions WHERE id = $1 FOR UPDATE`,
        [modelVersionId],
      );

      if (result.rowCount === 0) {
        throw new Error(`Model version ${modelVersionId} not found`);
      }

      const modelType = result.rows[0].model_type;

      await client.query(
        `UPDATE ml_model_versions SET is_active = false WHERE model_type = $1 AND is_active = true`,
        [modelType],
      );
      await client.query(
        `UPDATE ml_model_versions SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [modelVersionId],
      );

      await client.query('COMMIT');
      logger.info('Activated model version', { modelVersionId, modelType });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to activate model version', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollback(modelType: string): Promise<ModelVersion | null> {
    await this.initialize();
    const versions = await this.listVersions(modelType, 2);
    if (versions.length < 2) {
      logger.warn('No previous model version available for rollback', { modelType });
      return null;
    }

    const [current, previous] = versions;
    if (!previous) {
      return null;
    }

    await this.setActive(previous.id);
    logger.info('Rolled back model', {
      modelType,
      previousVersion: previous.version,
      deactivatedVersion: current.version,
    });
    return previous;
  }

  async listVersions(modelType?: string, limit = 25): Promise<ModelVersion[]> {
    await this.initialize();

    const conditions = [] as string[];
    const params = [] as any[];

    if (modelType) {
      params.push(modelType);
      conditions.push(`model_type = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `
        SELECT *
        FROM ml_model_versions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1}
      `,
      [...params, limit],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async getActiveModel(modelType: string): Promise<ModelVersion | null> {
    await this.initialize();

    const result = await this.pool.query(
      `
        SELECT *
        FROM ml_model_versions
        WHERE model_type = $1 AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [modelType],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async getModelById(modelVersionId: string): Promise<ModelVersion | null> {
    await this.initialize();

    const result = await this.pool.query(
      `SELECT * FROM ml_model_versions WHERE id = $1`,
      [modelVersionId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async updateMetrics(
    modelVersionId: string,
    metrics: Partial<TrainingMetrics>,
  ): Promise<void> {
    await this.initialize();

    await this.pool.query(
      `
        UPDATE ml_model_versions
        SET metrics = coalesce(metrics, '{}'::jsonb) || $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [modelVersionId, JSON.stringify(metrics)],
    );
  }

  private mapRow(row: any): ModelVersion {
    return {
      id: row.id,
      version: row.version,
      modelType: row.model_type,
      metrics: row.metrics ?? {},
      isActive: row.is_active,
      createdAt: row.created_at,
      modelPath: row.model_path,
      hyperparameters: row.hyperparameters ?? {},
    };
  }
}
