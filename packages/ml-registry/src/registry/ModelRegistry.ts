/**
 * ModelRegistry - Core ML Model Registry implementation
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  ModelMetadata,
  ModelMetadataSchema,
  ModelStage,
  ModelSearchQuery,
  ModelSearchResult,
  ModelRegistryConfig,
} from '../types.js';

export class ModelRegistry {
  private pool: Pool;
  private redis?: RedisClientType;
  private logger: pino.Logger;
  private config: ModelRegistryConfig;

  constructor(config: ModelRegistryConfig) {
    this.config = config;
    this.logger = pino({ name: 'ml-registry' });

    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize Redis if configured
    if (config.redis) {
      this.redis = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });

      this.redis.on('error', (err) => {
        this.logger.error({ err }, 'Redis connection error');
      });
    }
  }

  /**
   * Initialize the registry and create tables if needed
   */
  async initialize(): Promise<void> {
    try {
      await this.createTables();

      if (this.redis) {
        await this.redis.connect();
      }

      this.logger.info('Model Registry initialized successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize Model Registry');
      throw error;
    }
  }

  /**
   * Create database tables for the registry
   */
  private async createTables(): Promise<void> {
    const createModelsTable = `
      CREATE TABLE IF NOT EXISTS ml_models (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(100) NOT NULL,
        framework VARCHAR(50) NOT NULL,
        model_type VARCHAR(50) NOT NULL,
        stage VARCHAR(50) NOT NULL,
        description TEXT,
        tags TEXT[],
        author VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        parent_version VARCHAR(100),
        metrics JSONB DEFAULT '{}',
        hyperparameters JSONB DEFAULT '{}',
        training_dataset VARCHAR(255),
        validation_dataset VARCHAR(255),
        test_dataset VARCHAR(255),
        artifact_uri TEXT NOT NULL,
        model_size_bytes BIGINT NOT NULL,
        input_schema JSONB,
        output_schema JSONB,
        dependencies TEXT[],
        environment JSONB DEFAULT '{}',
        UNIQUE(name, version)
      );

      CREATE INDEX IF NOT EXISTS idx_ml_models_name ON ml_models(name);
      CREATE INDEX IF NOT EXISTS idx_ml_models_stage ON ml_models(stage);
      CREATE INDEX IF NOT EXISTS idx_ml_models_framework ON ml_models(framework);
      CREATE INDEX IF NOT EXISTS idx_ml_models_created_at ON ml_models(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ml_models_tags ON ml_models USING GIN(tags);
    `;

    await this.pool.query(createModelsTable);
  }

  /**
   * Register a new model
   */
  async registerModel(model: Omit<ModelMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<ModelMetadata> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullModel: ModelMetadata = {
      id,
      created_at: now,
      updated_at: now,
      ...model,
    };

    // Validate with Zod
    const validated = ModelMetadataSchema.parse(fullModel);

    const query = `
      INSERT INTO ml_models (
        id, name, version, framework, model_type, stage, description, tags,
        author, created_at, updated_at, parent_version, metrics, hyperparameters,
        training_dataset, validation_dataset, test_dataset, artifact_uri,
        model_size_bytes, input_schema, output_schema, dependencies, environment
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.name,
      validated.version,
      validated.framework,
      validated.model_type,
      validated.stage,
      validated.description,
      validated.tags,
      validated.author,
      validated.created_at,
      validated.updated_at,
      validated.parent_version,
      JSON.stringify(validated.metrics),
      JSON.stringify(validated.hyperparameters),
      validated.training_dataset,
      validated.validation_dataset,
      validated.test_dataset,
      validated.artifact_uri,
      validated.model_size_bytes,
      validated.input_schema ? JSON.stringify(validated.input_schema) : null,
      validated.output_schema ? JSON.stringify(validated.output_schema) : null,
      validated.dependencies,
      JSON.stringify(validated.environment),
    ];

    const result = await this.pool.query(query, values);

    // Invalidate cache
    if (this.redis) {
      await this.invalidateCache(validated.name, validated.version);
    }

    this.logger.info({ modelId: id, name: validated.name, version: validated.version }, 'Model registered');

    return this.parseModelRow(result.rows[0]);
  }

  /**
   * Get a model by name and version
   */
  async getModel(name: string, version: string): Promise<ModelMetadata | null> {
    // Try cache first
    if (this.redis) {
      const cacheKey = `model:${name}:${version}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const query = 'SELECT * FROM ml_models WHERE name = $1 AND version = $2';
    const result = await this.pool.query(query, [name, version]);

    if (result.rows.length === 0) {
      return null;
    }

    const model = this.parseModelRow(result.rows[0]);

    // Cache the result
    if (this.redis) {
      const cacheKey = `model:${name}:${version}`;
      await this.redis.setEx(cacheKey, 3600, JSON.stringify(model));
    }

    return model;
  }

  /**
   * Get model by ID
   */
  async getModelById(id: string): Promise<ModelMetadata | null> {
    const query = 'SELECT * FROM ml_models WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseModelRow(result.rows[0]);
  }

  /**
   * Get latest version of a model
   */
  async getLatestVersion(name: string, stage?: ModelStage): Promise<ModelMetadata | null> {
    let query = 'SELECT * FROM ml_models WHERE name = $1';
    const params: any[] = [name];

    if (stage) {
      query += ' AND stage = $2';
      params.push(stage);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseModelRow(result.rows[0]);
  }

  /**
   * List all versions of a model
   */
  async listVersions(name: string): Promise<ModelMetadata[]> {
    const query = 'SELECT * FROM ml_models WHERE name = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [name]);

    return result.rows.map(row => this.parseModelRow(row));
  }

  /**
   * Search models with filters
   */
  async searchModels(query: ModelSearchQuery): Promise<ModelSearchResult> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${query.name}%`);
      paramIndex++;
    }

    if (query.framework) {
      conditions.push(`framework = $${paramIndex}`);
      params.push(query.framework);
      paramIndex++;
    }

    if (query.model_type) {
      conditions.push(`model_type = $${paramIndex}`);
      params.push(query.model_type);
      paramIndex++;
    }

    if (query.stage) {
      conditions.push(`stage = $${paramIndex}`);
      params.push(query.stage);
      paramIndex++;
    }

    if (query.author) {
      conditions.push(`author = $${paramIndex}`);
      params.push(query.author);
      paramIndex++;
    }

    if (query.tags && query.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(query.tags);
      paramIndex++;
    }

    if (query.created_after) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(query.created_after.toISOString());
      paramIndex++;
    }

    if (query.created_before) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(query.created_before.toISOString());
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'desc';
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ml_models ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM ml_models
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, params);

    return {
      models: dataResult.rows.map(row => this.parseModelRow(row)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update model stage
   */
  async updateStage(name: string, version: string, newStage: ModelStage): Promise<void> {
    const query = `
      UPDATE ml_models
      SET stage = $1, updated_at = $2
      WHERE name = $3 AND version = $4
    `;

    await this.pool.query(query, [newStage, new Date().toISOString(), name, version]);

    if (this.redis) {
      await this.invalidateCache(name, version);
    }

    this.logger.info({ name, version, newStage }, 'Model stage updated');
  }

  /**
   * Update model metadata
   */
  async updateMetadata(
    name: string,
    version: string,
    updates: Partial<Pick<ModelMetadata, 'description' | 'tags' | 'metrics'>>
  ): Promise<void> {
    const setClauses: string[] = ['updated_at = $1'];
    const params: any[] = [new Date().toISOString()];
    let paramIndex = 2;

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(updates.description);
      paramIndex++;
    }

    if (updates.tags !== undefined) {
      setClauses.push(`tags = $${paramIndex}`);
      params.push(updates.tags);
      paramIndex++;
    }

    if (updates.metrics !== undefined) {
      setClauses.push(`metrics = $${paramIndex}`);
      params.push(JSON.stringify(updates.metrics));
      paramIndex++;
    }

    const query = `
      UPDATE ml_models
      SET ${setClauses.join(', ')}
      WHERE name = $${paramIndex} AND version = $${paramIndex + 1}
    `;
    params.push(name, version);

    await this.pool.query(query, params);

    if (this.redis) {
      await this.invalidateCache(name, version);
    }
  }

  /**
   * Delete a model (soft delete by moving to archived)
   */
  async archiveModel(name: string, version: string): Promise<void> {
    await this.updateStage(name, version, ModelStage.ARCHIVED);
  }

  /**
   * Helper to parse database row into ModelMetadata
   */
  private parseModelRow(row: any): ModelMetadata {
    return ModelMetadataSchema.parse({
      ...row,
      tags: row.tags || [],
      metrics: row.metrics || {},
      hyperparameters: row.hyperparameters || {},
      dependencies: row.dependencies || [],
      environment: row.environment || {},
    });
  }

  /**
   * Invalidate cache for a model
   */
  private async invalidateCache(name: string, version: string): Promise<void> {
    if (!this.redis) return;

    const cacheKey = `model:${name}:${version}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    if (this.redis) {
      await this.redis.disconnect();
    }
    this.logger.info('Model Registry closed');
  }
}
