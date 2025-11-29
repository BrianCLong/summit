/**
 * Model Registry - Core CRUD operations for models and versions
 */

import { PoolClient } from 'pg';
import { db } from '../db/connection.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import {
  Model,
  ModelSchema,
  CreateModelInput,
  UpdateModelInput,
  ModelVersion,
  ModelVersionSchema,
  CreateModelVersionInput,
  ModelStatus,
  ModelCapability,
  ModelProvider,
} from '../types/index.js';

// ============================================================================
// Database Row Types
// ============================================================================

interface ModelRow {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  provider: string;
  capabilities: string[];
  status: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

interface ModelVersionRow {
  id: string;
  model_id: string;
  version: string;
  status: string;
  endpoint: string | null;
  endpoint_type: string;
  credentials: Record<string, unknown> | null;
  configuration: Record<string, unknown>;
  resource_requirements: Record<string, unknown>;
  performance_metrics: Record<string, unknown>;
  evaluation_results: Record<string, number>;
  changelog: string | null;
  release_notes: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  promoted_at: Date | null;
  promoted_by: string | null;
}

// ============================================================================
// Row to Model Transformation
// ============================================================================

function rowToModel(row: ModelRow): Model {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description || undefined,
    provider: row.provider as ModelProvider,
    capabilities: row.capabilities as ModelCapability[],
    status: row.status as ModelStatus,
    tags: row.tags,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function rowToModelVersion(row: ModelVersionRow): ModelVersion {
  return {
    id: row.id,
    modelId: row.model_id,
    version: row.version,
    status: row.status as ModelStatus,
    endpoint: row.endpoint || undefined,
    endpointType: row.endpoint_type as 'rest' | 'grpc' | 'websocket',
    credentials: row.credentials || undefined,
    configuration: row.configuration,
    resourceRequirements: row.resource_requirements,
    performanceMetrics: row.performance_metrics,
    evaluationResults: row.evaluation_results,
    changelog: row.changelog || undefined,
    releaseNotes: row.release_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    promotedAt: row.promoted_at || undefined,
    promotedBy: row.promoted_by || undefined,
  };
}

// ============================================================================
// Model Registry Class
// ============================================================================

export interface ListModelsOptions {
  provider?: ModelProvider;
  capability?: ModelCapability;
  status?: ModelStatus;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'created_at' | 'updated_at';
  orderDirection?: 'asc' | 'desc';
}

export interface ListModelVersionsOptions {
  modelId?: string;
  status?: ModelStatus;
  limit?: number;
  offset?: number;
}

export class ModelRegistry {
  // ==========================================================================
  // Model Operations
  // ==========================================================================

  async createModel(input: CreateModelInput, client?: PoolClient): Promise<Model> {
    const id = generateId();
    const now = new Date();

    // Check for duplicate name
    const existing = await this.getModelByName(input.name, client);
    if (existing) {
      throw new ConflictError(`Model with name '${input.name}' already exists`);
    }

    const query = `
      INSERT INTO model_hub_models (
        id, name, display_name, description, provider, capabilities,
        status, tags, metadata, created_at, updated_at, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const params = [
      id,
      input.name,
      input.displayName,
      input.description || null,
      input.provider,
      input.capabilities,
      input.status || 'draft',
      input.tags || [],
      input.metadata || {},
      now,
      now,
      input.createdBy,
      input.updatedBy,
    ];

    const result = await db.query<ModelRow>(query, params, client);
    const model = rowToModel(result.rows[0]);

    logger.info({
      message: 'Model created',
      modelId: model.id,
      modelName: model.name,
    });

    return model;
  }

  async getModel(id: string, client?: PoolClient): Promise<Model> {
    const query = 'SELECT * FROM model_hub_models WHERE id = $1';
    const result = await db.query<ModelRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('Model', id);
    }

    return rowToModel(result.rows[0]);
  }

  async getModelByName(name: string, client?: PoolClient): Promise<Model | null> {
    const query = 'SELECT * FROM model_hub_models WHERE name = $1';
    const result = await db.query<ModelRow>(query, [name], client);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToModel(result.rows[0]);
  }

  async listModels(options: ListModelsOptions = {}): Promise<{ models: Model[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.provider) {
      conditions.push(`provider = $${paramIndex++}`);
      params.push(options.provider);
    }

    if (options.capability) {
      conditions.push(`$${paramIndex++} = ANY(capabilities)`);
      params.push(options.capability);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.tags && options.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      params.push(options.tags);
    }

    if (options.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`);
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = options.orderBy || 'created_at';
    const orderDirection = options.orderDirection || 'desc';
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM model_hub_models ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_models
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<ModelRow>(query, [...params, limit, offset]);
    const models = result.rows.map(rowToModel);

    return { models, total };
  }

  async updateModel(id: string, input: UpdateModelInput, client?: PoolClient): Promise<Model> {
    // Verify model exists
    await this.getModel(id, client);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      params.push(input.displayName);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }
    if (input.provider !== undefined) {
      updates.push(`provider = $${paramIndex++}`);
      params.push(input.provider);
    }
    if (input.capabilities !== undefined) {
      updates.push(`capabilities = $${paramIndex++}`);
      params.push(input.capabilities);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(input.tags);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(input.metadata);
    }
    if (input.updatedBy !== undefined) {
      updates.push(`updated_by = $${paramIndex++}`);
      params.push(input.updatedBy);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());

    params.push(id);

    const query = `
      UPDATE model_hub_models
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query<ModelRow>(query, params, client);
    const model = rowToModel(result.rows[0]);

    logger.info({
      message: 'Model updated',
      modelId: model.id,
      modelName: model.name,
    });

    return model;
  }

  async deleteModel(id: string, client?: PoolClient): Promise<void> {
    // Verify model exists
    await this.getModel(id, client);

    const query = 'DELETE FROM model_hub_models WHERE id = $1';
    await db.query(query, [id], client);

    logger.info({
      message: 'Model deleted',
      modelId: id,
    });
  }

  // ==========================================================================
  // Model Version Operations
  // ==========================================================================

  async createModelVersion(input: CreateModelVersionInput, client?: PoolClient): Promise<ModelVersion> {
    const id = generateId();
    const now = new Date();

    // Verify model exists
    await this.getModel(input.modelId, client);

    // Check for duplicate version
    const existing = await this.getModelVersionByVersion(input.modelId, input.version, client);
    if (existing) {
      throw new ConflictError(`Version '${input.version}' already exists for this model`);
    }

    const query = `
      INSERT INTO model_hub_model_versions (
        id, model_id, version, status, endpoint, endpoint_type,
        credentials, configuration, resource_requirements, performance_metrics,
        evaluation_results, changelog, release_notes,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const params = [
      id,
      input.modelId,
      input.version,
      input.status || 'draft',
      input.endpoint || null,
      input.endpointType || 'rest',
      input.credentials || null,
      input.configuration || {},
      input.resourceRequirements || {},
      input.performanceMetrics || {},
      input.evaluationResults || {},
      input.changelog || null,
      input.releaseNotes || null,
      now,
      now,
      input.createdBy,
    ];

    const result = await db.query<ModelVersionRow>(query, params, client);
    const version = rowToModelVersion(result.rows[0]);

    logger.info({
      message: 'Model version created',
      modelVersionId: version.id,
      modelId: version.modelId,
      version: version.version,
    });

    return version;
  }

  async getModelVersion(id: string, client?: PoolClient): Promise<ModelVersion> {
    const query = 'SELECT * FROM model_hub_model_versions WHERE id = $1';
    const result = await db.query<ModelVersionRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('ModelVersion', id);
    }

    return rowToModelVersion(result.rows[0]);
  }

  async getModelVersionByVersion(
    modelId: string,
    version: string,
    client?: PoolClient,
  ): Promise<ModelVersion | null> {
    const query = 'SELECT * FROM model_hub_model_versions WHERE model_id = $1 AND version = $2';
    const result = await db.query<ModelVersionRow>(query, [modelId, version], client);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToModelVersion(result.rows[0]);
  }

  async getLatestModelVersion(modelId: string, client?: PoolClient): Promise<ModelVersion | null> {
    const query = `
      SELECT * FROM model_hub_model_versions
      WHERE model_id = $1 AND status IN ('active', 'approved')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await db.query<ModelVersionRow>(query, [modelId], client);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToModelVersion(result.rows[0]);
  }

  async listModelVersions(options: ListModelVersionsOptions = {}): Promise<{
    versions: ModelVersion[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.modelId) {
      conditions.push(`model_id = $${paramIndex++}`);
      params.push(options.modelId);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM model_hub_model_versions ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_model_versions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<ModelVersionRow>(query, [...params, limit, offset]);
    const versions = result.rows.map(rowToModelVersion);

    return { versions, total };
  }

  async updateModelVersion(
    id: string,
    input: Partial<CreateModelVersionInput> & { updatedBy?: string },
    client?: PoolClient,
  ): Promise<ModelVersion> {
    // Verify version exists
    await this.getModelVersion(id, client);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
    }
    if (input.endpoint !== undefined) {
      updates.push(`endpoint = $${paramIndex++}`);
      params.push(input.endpoint);
    }
    if (input.endpointType !== undefined) {
      updates.push(`endpoint_type = $${paramIndex++}`);
      params.push(input.endpointType);
    }
    if (input.credentials !== undefined) {
      updates.push(`credentials = $${paramIndex++}`);
      params.push(input.credentials);
    }
    if (input.configuration !== undefined) {
      updates.push(`configuration = $${paramIndex++}`);
      params.push(input.configuration);
    }
    if (input.resourceRequirements !== undefined) {
      updates.push(`resource_requirements = $${paramIndex++}`);
      params.push(input.resourceRequirements);
    }
    if (input.performanceMetrics !== undefined) {
      updates.push(`performance_metrics = $${paramIndex++}`);
      params.push(input.performanceMetrics);
    }
    if (input.evaluationResults !== undefined) {
      updates.push(`evaluation_results = $${paramIndex++}`);
      params.push(input.evaluationResults);
    }
    if (input.changelog !== undefined) {
      updates.push(`changelog = $${paramIndex++}`);
      params.push(input.changelog);
    }
    if (input.releaseNotes !== undefined) {
      updates.push(`release_notes = $${paramIndex++}`);
      params.push(input.releaseNotes);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());

    params.push(id);

    const query = `
      UPDATE model_hub_model_versions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query<ModelVersionRow>(query, params, client);
    const version = rowToModelVersion(result.rows[0]);

    logger.info({
      message: 'Model version updated',
      modelVersionId: version.id,
      version: version.version,
    });

    return version;
  }

  async promoteModelVersion(
    id: string,
    promotedBy: string,
    client?: PoolClient,
  ): Promise<ModelVersion> {
    const query = `
      UPDATE model_hub_model_versions
      SET status = 'active', promoted_at = $1, promoted_by = $2, updated_at = $1
      WHERE id = $3
      RETURNING *
    `;

    const now = new Date();
    const result = await db.query<ModelVersionRow>(query, [now, promotedBy, id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('ModelVersion', id);
    }

    const version = rowToModelVersion(result.rows[0]);

    logger.info({
      message: 'Model version promoted',
      modelVersionId: version.id,
      version: version.version,
      promotedBy,
    });

    return version;
  }

  async deprecateModelVersion(id: string, updatedBy: string, client?: PoolClient): Promise<ModelVersion> {
    const query = `
      UPDATE model_hub_model_versions
      SET status = 'deprecated', updated_at = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query<ModelVersionRow>(query, [new Date(), id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('ModelVersion', id);
    }

    const version = rowToModelVersion(result.rows[0]);

    logger.info({
      message: 'Model version deprecated',
      modelVersionId: version.id,
      version: version.version,
      updatedBy,
    });

    return version;
  }

  async deleteModelVersion(id: string, client?: PoolClient): Promise<void> {
    // Verify version exists
    await this.getModelVersion(id, client);

    const query = 'DELETE FROM model_hub_model_versions WHERE id = $1';
    await db.query(query, [id], client);

    logger.info({
      message: 'Model version deleted',
      modelVersionId: id,
    });
  }

  // ==========================================================================
  // Query Helpers
  // ==========================================================================

  async getActiveVersionsForCapability(
    capability: ModelCapability,
    client?: PoolClient,
  ): Promise<Array<{ model: Model; version: ModelVersion }>> {
    const query = `
      SELECT
        m.id as model_id, m.name, m.display_name, m.description, m.provider,
        m.capabilities, m.status as model_status, m.tags, m.metadata,
        m.created_at as model_created_at, m.updated_at as model_updated_at,
        m.created_by as model_created_by, m.updated_by as model_updated_by,
        v.id as version_id, v.version, v.status as version_status,
        v.endpoint, v.endpoint_type, v.credentials, v.configuration,
        v.resource_requirements, v.performance_metrics, v.evaluation_results,
        v.changelog, v.release_notes, v.created_at as version_created_at,
        v.updated_at as version_updated_at, v.created_by as version_created_by,
        v.promoted_at, v.promoted_by
      FROM model_hub_models m
      JOIN model_hub_model_versions v ON m.id = v.model_id
      WHERE $1 = ANY(m.capabilities)
        AND m.status = 'active'
        AND v.status = 'active'
      ORDER BY v.promoted_at DESC NULLS LAST
    `;

    const result = await db.query(query, [capability], client);

    return result.rows.map((row: any) => ({
      model: rowToModel({
        id: row.model_id,
        name: row.name,
        display_name: row.display_name,
        description: row.description,
        provider: row.provider,
        capabilities: row.capabilities,
        status: row.model_status,
        tags: row.tags,
        metadata: row.metadata,
        created_at: row.model_created_at,
        updated_at: row.model_updated_at,
        created_by: row.model_created_by,
        updated_by: row.model_updated_by,
      }),
      version: rowToModelVersion({
        id: row.version_id,
        model_id: row.model_id,
        version: row.version,
        status: row.version_status,
        endpoint: row.endpoint,
        endpoint_type: row.endpoint_type,
        credentials: row.credentials,
        configuration: row.configuration,
        resource_requirements: row.resource_requirements,
        performance_metrics: row.performance_metrics,
        evaluation_results: row.evaluation_results,
        changelog: row.changelog,
        release_notes: row.release_notes,
        created_at: row.version_created_at,
        updated_at: row.version_updated_at,
        created_by: row.version_created_by,
        promoted_at: row.promoted_at,
        promoted_by: row.promoted_by,
      }),
    }));
  }
}

// Export singleton instance
export const modelRegistry = new ModelRegistry();
