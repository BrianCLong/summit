/**
 * Data Factory Service - Dataset Service
 *
 * Manages dataset lifecycle: creation, versioning, splits, and metadata.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import {
  Dataset,
  DatasetStatus,
  DatasetSplit,
  SplitType,
  CreateDatasetRequest,
  UpdateDatasetRequest,
  PaginationParams,
  PaginatedResponse,
  PolicyProfile,
  QualityMetrics,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import pino from 'pino';

const logger = pino({ name: 'dataset-service' });

export class DatasetService {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  async create(
    request: CreateDatasetRequest,
    createdBy: string
  ): Promise<Dataset> {
    const id = uuidv4();
    const version = '1.0.0';
    const now = new Date();

    const policyProfile = await this.getPolicyProfile(request.policyProfileId);
    if (!policyProfile) {
      throw new Error(`Policy profile not found: ${request.policyProfileId}`);
    }

    const result = await query<{
      id: string;
      name: string;
      description: string;
      version: string;
      status: DatasetStatus;
      task_type: string;
      use_case: string;
      model_target: string | null;
      sample_count: number;
      labeled_sample_count: number;
      source_provenance: string;
      license_id: string;
      license_type: string;
      license_text: string | null;
      license_url: string | null;
      attribution_required: boolean;
      commercial_use_allowed: boolean;
      derivative_works_allowed: boolean;
      sharing_allowed: boolean;
      license_expiration_date: Date | null;
      jurisdiction: string;
      data_localization_required: boolean;
      retention_policy_id: string;
      compliance_frameworks: string;
      export_restrictions: string;
      policy_profile_id: string;
      schema_definition: string;
      quality_metrics: string;
      tags: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      published_at: Date | null;
    }>(
      `INSERT INTO datasets (
        id, name, description, version, status, task_type, use_case, model_target,
        source_provenance, license_id, license_type, license_text, license_url,
        attribution_required, commercial_use_allowed, derivative_works_allowed,
        sharing_allowed, license_expiration_date, jurisdiction, data_localization_required,
        retention_policy_id, compliance_frameworks, export_restrictions,
        policy_profile_id, schema_definition, quality_metrics, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        id,
        request.name,
        request.description,
        version,
        DatasetStatus.DRAFT,
        request.taskType,
        request.useCase,
        request.modelTarget || null,
        JSON.stringify({
          sourceId: uuidv4(),
          sourceName: 'manual-upload',
          sourceType: 'internal',
          collectionDate: now,
          collectionMethod: 'manual',
          originalFormat: 'mixed',
          transformationHistory: [],
        }),
        request.license.licenseId,
        request.license.licenseType,
        request.license.licenseText || null,
        request.license.licenseUrl || null,
        request.license.attributionRequired,
        request.license.commercialUseAllowed,
        request.license.derivativeWorksAllowed,
        request.license.sharingAllowed,
        request.license.expirationDate || null,
        request.jurisdiction.jurisdiction,
        request.jurisdiction.dataLocalizationRequired,
        request.jurisdiction.retentionPolicyId,
        JSON.stringify(request.jurisdiction.complianceFrameworks),
        JSON.stringify(request.jurisdiction.exportRestrictions),
        request.policyProfileId,
        JSON.stringify(request.schema),
        JSON.stringify({ labelDistribution: {} }),
        JSON.stringify(request.tags || []),
        createdBy,
      ]
    );

    const dataset = this.mapRowToDataset(result.rows[0], policyProfile);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'create',
      actorId: createdBy,
      actorRole: 'user',
      newState: dataset as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ datasetId: id, name: request.name }, 'Dataset created');
    return dataset;
  }

  async getById(id: string): Promise<Dataset | null> {
    const result = await query<{
      id: string;
      name: string;
      description: string;
      version: string;
      status: DatasetStatus;
      task_type: string;
      use_case: string;
      model_target: string | null;
      sample_count: number;
      labeled_sample_count: number;
      source_provenance: string;
      license_id: string;
      license_type: string;
      license_text: string | null;
      license_url: string | null;
      attribution_required: boolean;
      commercial_use_allowed: boolean;
      derivative_works_allowed: boolean;
      sharing_allowed: boolean;
      license_expiration_date: Date | null;
      jurisdiction: string;
      data_localization_required: boolean;
      retention_policy_id: string;
      compliance_frameworks: string;
      export_restrictions: string;
      policy_profile_id: string;
      schema_definition: string;
      quality_metrics: string;
      tags: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      published_at: Date | null;
    }>('SELECT * FROM datasets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const policyProfile = await this.getPolicyProfile(row.policy_profile_id);
    const splits = await this.getSplits(id);

    return this.mapRowToDataset(row, policyProfile!, splits);
  }

  async list(
    params: PaginationParams,
    filters?: {
      status?: DatasetStatus;
      taskType?: string;
      useCase?: string;
      createdBy?: string;
      tags?: string[];
    }
  ): Promise<PaginatedResponse<Dataset>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters?.taskType) {
      conditions.push(`task_type = $${paramIndex++}`);
      values.push(filters.taskType);
    }
    if (filters?.useCase) {
      conditions.push(`use_case = $${paramIndex++}`);
      values.push(filters.useCase);
    }
    if (filters?.createdBy) {
      conditions.push(`created_by = $${paramIndex++}`);
      values.push(filters.createdBy);
    }
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(`tags ?| $${paramIndex++}`);
      values.push(filters.tags);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM datasets ${whereClause}`,
      values
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const offset = (params.page - 1) * params.pageSize;
    const sortColumn = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    const dataResult = await query<{
      id: string;
      name: string;
      description: string;
      version: string;
      status: DatasetStatus;
      task_type: string;
      use_case: string;
      model_target: string | null;
      sample_count: number;
      labeled_sample_count: number;
      source_provenance: string;
      license_id: string;
      license_type: string;
      license_text: string | null;
      license_url: string | null;
      attribution_required: boolean;
      commercial_use_allowed: boolean;
      derivative_works_allowed: boolean;
      sharing_allowed: boolean;
      license_expiration_date: Date | null;
      jurisdiction: string;
      data_localization_required: boolean;
      retention_policy_id: string;
      compliance_frameworks: string;
      export_restrictions: string;
      policy_profile_id: string;
      schema_definition: string;
      quality_metrics: string;
      tags: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      published_at: Date | null;
    }>(
      `SELECT * FROM datasets ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, params.pageSize, offset]
    );

    const datasets = await Promise.all(
      dataResult.rows.map(async (row) => {
        const policyProfile = await this.getPolicyProfile(row.policy_profile_id);
        const splits = await this.getSplits(row.id);
        return this.mapRowToDataset(row, policyProfile!, splits);
      })
    );

    return {
      data: datasets,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / params.pageSize),
        hasNext: params.page * params.pageSize < totalItems,
        hasPrevious: params.page > 1,
      },
    };
  }

  async update(
    id: string,
    request: UpdateDatasetRequest,
    updatedBy: string
  ): Promise<Dataset> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Dataset not found: ${id}`);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (request.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(request.name);
    }
    if (request.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(request.description);
    }
    if (request.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(request.status);
    }
    if (request.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(request.tags));
    }
    if (request.policyProfileId !== undefined) {
      updates.push(`policy_profile_id = $${paramIndex++}`);
      values.push(request.policyProfileId);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    await query(
      `UPDATE datasets SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const updated = await this.getById(id);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'update',
      actorId: updatedBy,
      actorRole: 'user',
      previousState: existing as unknown as Record<string, unknown>,
      newState: updated as unknown as Record<string, unknown>,
      metadata: { changes: Object.keys(request) },
    });

    logger.info({ datasetId: id }, 'Dataset updated');
    return updated!;
  }

  async publish(id: string, publishedBy: string): Promise<Dataset> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Dataset not found: ${id}`);
    }

    if (existing.status !== DatasetStatus.ACTIVE) {
      throw new Error('Dataset must be active before publishing');
    }

    if (existing.sampleCount === 0) {
      throw new Error('Dataset must have samples before publishing');
    }

    await query(
      'UPDATE datasets SET published_at = NOW() WHERE id = $1',
      [id]
    );

    const published = await this.getById(id);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'publish',
      actorId: publishedBy,
      actorRole: 'user',
      newState: published as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ datasetId: id }, 'Dataset published');
    return published!;
  }

  async createVersion(
    id: string,
    newVersion: string,
    createdBy: string
  ): Promise<Dataset> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Dataset not found: ${id}`);
    }

    return await transaction(async (client) => {
      const newId = uuidv4();

      await client.query(
        `INSERT INTO datasets (
          id, name, description, version, status, task_type, use_case, model_target,
          source_provenance, license_id, license_type, license_text, license_url,
          attribution_required, commercial_use_allowed, derivative_works_allowed,
          sharing_allowed, license_expiration_date, jurisdiction, data_localization_required,
          retention_policy_id, compliance_frameworks, export_restrictions,
          policy_profile_id, schema_definition, quality_metrics, tags, created_by
        )
        SELECT
          $1, name, description, $2, 'draft', task_type, use_case, model_target,
          source_provenance, license_id, license_type, license_text, license_url,
          attribution_required, commercial_use_allowed, derivative_works_allowed,
          sharing_allowed, license_expiration_date, jurisdiction, data_localization_required,
          retention_policy_id, compliance_frameworks, export_restrictions,
          policy_profile_id, schema_definition, quality_metrics, tags, $3
        FROM datasets WHERE id = $4`,
        [newId, newVersion, createdBy, id]
      );

      // Copy splits
      await client.query(
        `INSERT INTO dataset_splits (dataset_id, split_type, sample_count, percentage, seed, stratify_by)
         SELECT $1, split_type, 0, percentage, seed, stratify_by
         FROM dataset_splits WHERE dataset_id = $2`,
        [newId, id]
      );

      logger.info(
        { sourceDatasetId: id, newDatasetId: newId, version: newVersion },
        'Dataset version created'
      );

      return (await this.getById(newId))!;
    });
  }

  async configureSplits(
    id: string,
    splits: Array<{
      splitType: SplitType;
      percentage: number;
      seed: number;
      stratifyBy?: string;
    }>,
    configuredBy: string
  ): Promise<DatasetSplit[]> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Dataset not found: ${id}`);
    }

    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Split percentages must sum to 100');
    }

    await transaction(async (client) => {
      await client.query('DELETE FROM dataset_splits WHERE dataset_id = $1', [id]);

      for (const split of splits) {
        await client.query(
          `INSERT INTO dataset_splits (dataset_id, split_type, percentage, seed, stratify_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, split.splitType, split.percentage, split.seed, split.stratifyBy || null]
        );
      }
    });

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'configure_splits',
      actorId: configuredBy,
      actorRole: 'user',
      newState: { splits } as unknown as Record<string, unknown>,
      metadata: {},
    });

    return this.getSplits(id);
  }

  async applySplits(id: string, appliedBy: string): Promise<void> {
    const dataset = await this.getById(id);
    if (!dataset) {
      throw new Error(`Dataset not found: ${id}`);
    }

    const splits = await this.getSplits(id);
    if (splits.length === 0) {
      throw new Error('No splits configured');
    }

    await transaction(async (client) => {
      // Get all sample IDs with deterministic ordering
      const samples = await client.query<{ id: string }>(
        'SELECT id FROM samples WHERE dataset_id = $1 ORDER BY content_hash',
        [id]
      );

      const sampleIds = samples.rows.map((r) => r.id);
      const totalSamples = sampleIds.length;

      let currentIndex = 0;
      for (const split of splits) {
        const count = Math.round((split.percentage / 100) * totalSamples);
        const splitSampleIds = sampleIds.slice(currentIndex, currentIndex + count);

        if (splitSampleIds.length > 0) {
          await client.query(
            `UPDATE samples SET split = $1 WHERE id = ANY($2)`,
            [split.splitType, splitSampleIds]
          );

          await client.query(
            `UPDATE dataset_splits SET sample_count = $1
             WHERE dataset_id = $2 AND split_type = $3`,
            [splitSampleIds.length, id, split.splitType]
          );
        }

        currentIndex += count;
      }
    });

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'apply_splits',
      actorId: appliedBy,
      actorRole: 'user',
      metadata: { sampleCount: dataset.sampleCount },
    });

    logger.info({ datasetId: id }, 'Splits applied to samples');
  }

  async updateQualityMetrics(
    id: string,
    metrics: Partial<QualityMetrics>
  ): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Dataset not found: ${id}`);
    }

    const updatedMetrics = {
      ...existing.qualityMetrics,
      ...metrics,
    };

    await query(
      'UPDATE datasets SET quality_metrics = $1 WHERE id = $2',
      [JSON.stringify(updatedMetrics), id]
    );

    logger.debug({ datasetId: id }, 'Quality metrics updated');
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Dataset not found: ${id}`);
    }

    if (existing.status === DatasetStatus.ACTIVE) {
      throw new Error('Cannot delete active dataset. Archive it first.');
    }

    await query('DELETE FROM datasets WHERE id = $1', [id]);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'delete',
      actorId: deletedBy,
      actorRole: 'user',
      previousState: existing as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ datasetId: id }, 'Dataset deleted');
  }

  private async getSplits(datasetId: string): Promise<DatasetSplit[]> {
    const result = await query<{
      split_type: SplitType;
      sample_count: number;
      percentage: number;
      seed: number;
      stratify_by: string | null;
    }>(
      'SELECT split_type, sample_count, percentage, seed, stratify_by FROM dataset_splits WHERE dataset_id = $1',
      [datasetId]
    );

    return result.rows.map((row) => ({
      splitType: row.split_type,
      sampleCount: row.sample_count,
      percentage: Number(row.percentage),
      seed: row.seed,
      stratifyBy: row.stratify_by || undefined,
    }));
  }

  private async getPolicyProfile(
    profileId: string
  ): Promise<PolicyProfile | null> {
    const result = await query<{
      profile_id: string;
      profile_name: string;
      allowed_use_cases: string;
      prohibited_use_cases: string;
      required_redactions: string;
      pii_handling: 'remove' | 'mask' | 'encrypt' | 'allow';
      sensitivity_level: 'public' | 'internal' | 'confidential' | 'restricted';
      audit_level: 'minimal' | 'standard' | 'comprehensive';
    }>('SELECT * FROM policy_profiles WHERE profile_id = $1', [profileId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      profileId: row.profile_id,
      profileName: row.profile_name,
      allowedUseCases: JSON.parse(row.allowed_use_cases),
      prohibitedUseCases: JSON.parse(row.prohibited_use_cases),
      requiredRedactions: JSON.parse(row.required_redactions),
      piiHandling: row.pii_handling,
      sensitivityLevel: row.sensitivity_level,
      auditLevel: row.audit_level,
    };
  }

  private mapRowToDataset(
    row: {
      id: string;
      name: string;
      description: string;
      version: string;
      status: DatasetStatus;
      task_type: string;
      use_case: string;
      model_target: string | null;
      sample_count: number;
      labeled_sample_count: number;
      source_provenance: string;
      license_id: string;
      license_type: string;
      license_text: string | null;
      license_url: string | null;
      attribution_required: boolean;
      commercial_use_allowed: boolean;
      derivative_works_allowed: boolean;
      sharing_allowed: boolean;
      license_expiration_date: Date | null;
      jurisdiction: string;
      data_localization_required: boolean;
      retention_policy_id: string;
      compliance_frameworks: string;
      export_restrictions: string;
      policy_profile_id: string;
      schema_definition: string;
      quality_metrics: string;
      tags: string;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      published_at: Date | null;
    },
    policyProfile: PolicyProfile,
    splits: DatasetSplit[] = []
  ): Dataset {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      status: row.status,
      taskType: row.task_type as Dataset['taskType'],
      useCase: row.use_case,
      modelTarget: row.model_target || undefined,
      sampleCount: row.sample_count,
      labeledSampleCount: row.labeled_sample_count,
      splits,
      provenance: JSON.parse(row.source_provenance),
      license: {
        licenseId: row.license_id,
        licenseType: row.license_type as Dataset['license']['licenseType'],
        licenseText: row.license_text || undefined,
        licenseUrl: row.license_url || undefined,
        attributionRequired: row.attribution_required,
        commercialUseAllowed: row.commercial_use_allowed,
        derivativeWorksAllowed: row.derivative_works_allowed,
        sharingAllowed: row.sharing_allowed,
        expirationDate: row.license_expiration_date || undefined,
      },
      jurisdiction: {
        jurisdiction: row.jurisdiction,
        dataLocalizationRequired: row.data_localization_required,
        retentionPolicyId: row.retention_policy_id,
        retentionDays: 90, // Default from policy
        complianceFrameworks: JSON.parse(row.compliance_frameworks),
        exportRestrictions: JSON.parse(row.export_restrictions),
      },
      policyProfile,
      schema: JSON.parse(row.schema_definition),
      qualityMetrics: JSON.parse(row.quality_metrics),
      tags: JSON.parse(row.tags),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at || undefined,
    };
  }
}
