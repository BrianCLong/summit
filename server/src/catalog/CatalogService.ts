/**
 * Data Catalog Service
 * Central service for dataset discovery, governance, and lineage
 */

import { Pool, PoolClient } from 'pg';
import logger from '../utils/logger.js';
import {
  DatasetMetadata,
  CatalogEntry,
  DatasetRegistration,
  DatasetQueryFilters,
  LineageEdge,
  LineageGraph,
  LineageQueryOptions,
  QualityMetrics,
  DatasetAccessLog,
  CatalogStats,
  SchemaVersion,
  ColumnMapping,
  AccessType,
  TransformationType,
} from './types.js';

export class CatalogService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Register a new dataset in the catalog
   */
  async registerDataset(
    registration: DatasetRegistration,
    userId?: string,
  ): Promise<DatasetMetadata> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `
        INSERT INTO catalog.datasets (
          dataset_id, name, description, data_type, classification_level,
          owner_team, owner_email, jurisdiction, tags,
          storage_system, storage_location, storage_metadata,
          schema_definition, contains_personal_data, contains_financial_data,
          contains_health_data, license_id, contract_references,
          authority_requirements, retention_days, retention_policy_id,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $22
        )
        RETURNING *
      `,
        [
          registration.datasetId,
          registration.name,
          registration.description,
          registration.dataType,
          registration.classificationLevel,
          registration.ownerTeam,
          registration.ownerEmail,
          JSON.stringify(registration.jurisdiction || ['US']),
          JSON.stringify(registration.tags || []),
          registration.storageSystem,
          registration.storageLocation,
          JSON.stringify({}),
          JSON.stringify(registration.schemaDefinition),
          registration.containsPersonalData,
          registration.containsFinancialData,
          registration.containsHealthData,
          registration.licenseId,
          JSON.stringify(registration.contractReferences || []),
          JSON.stringify(registration.authorityRequirements || []),
          registration.retentionDays,
          registration.retentionPolicyId,
          userId,
        ],
      );

      await client.query('COMMIT');

      logger.info({
        message: 'Dataset registered in catalog',
        datasetId: registration.datasetId,
        name: registration.name,
      });

      return this.rowToDatasetMetadata(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        message: 'Failed to register dataset',
        error: error.message,
        datasetId: registration.datasetId,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get dataset by ID
   */
  async getDataset(datasetId: string): Promise<DatasetMetadata | null> {
    const result = await this.pool.query(
      `SELECT * FROM catalog.datasets WHERE dataset_id = $1 AND deleted_at IS NULL`,
      [datasetId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToDatasetMetadata(result.rows[0]);
  }

  /**
   * List datasets with optional filters
   */
  async listDatasets(
    filters?: DatasetQueryFilters,
    limit = 100,
    offset = 0,
  ): Promise<CatalogEntry[]> {
    let query = `SELECT * FROM catalog.dataset_catalog WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.dataType) {
        const types = Array.isArray(filters.dataType)
          ? filters.dataType
          : [filters.dataType];
        query += ` AND data_type = ANY($${paramIndex})`;
        params.push(types);
        paramIndex++;
      }

      if (filters.classificationLevel) {
        const levels = Array.isArray(filters.classificationLevel)
          ? filters.classificationLevel
          : [filters.classificationLevel];
        query += ` AND classification_level = ANY($${paramIndex})`;
        params.push(levels);
        paramIndex++;
      }

      if (filters.ownerTeam) {
        const teams = Array.isArray(filters.ownerTeam)
          ? filters.ownerTeam
          : [filters.ownerTeam];
        query += ` AND owner_team = ANY($${paramIndex})`;
        params.push(teams);
        paramIndex++;
      }

      if (filters.storageSystem) {
        const systems = Array.isArray(filters.storageSystem)
          ? filters.storageSystem
          : [filters.storageSystem];
        query += ` AND storage_system = ANY($${paramIndex})`;
        params.push(systems);
        paramIndex++;
      }

      if (filters.tags) {
        const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        query += ` AND tags @> $${paramIndex}::jsonb`;
        params.push(JSON.stringify(tags));
        paramIndex++;
      }

      if (filters.containsPersonalData !== undefined) {
        query += ` AND contains_personal_data = $${paramIndex}`;
        params.push(filters.containsPersonalData);
        paramIndex++;
      }

      if (filters.isDeprecated !== undefined) {
        query += ` AND is_deprecated = $${paramIndex}`;
        params.push(filters.isDeprecated);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
    }

    query += ` ORDER BY name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => this.rowToCatalogEntry(row));
  }

  /**
   * Search datasets by name or description
   */
  async searchDatasets(searchTerm: string, limit = 20): Promise<CatalogEntry[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM catalog.dataset_catalog
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY
        CASE
          WHEN name ILIKE $1 THEN 1
          WHEN description ILIKE $1 THEN 2
          ELSE 3
        END,
        name
      LIMIT $2
    `,
      [`%${searchTerm}%`, limit],
    );

    return result.rows.map((row) => this.rowToCatalogEntry(row));
  }

  /**
   * Record lineage edge between datasets
   */
  async recordLineage(
    sourceDatasetId: string,
    targetDatasetId: string,
    transformationType: TransformationType,
    transformationDescription?: string,
    jobName?: string,
    columnMappings?: ColumnMapping[],
  ): Promise<LineageEdge> {
    // Get dataset UUIDs
    const sourceResult = await this.pool.query(
      `SELECT id FROM catalog.datasets WHERE dataset_id = $1`,
      [sourceDatasetId],
    );
    const targetResult = await this.pool.query(
      `SELECT id FROM catalog.datasets WHERE dataset_id = $1`,
      [targetDatasetId],
    );

    if (sourceResult.rows.length === 0 || targetResult.rows.length === 0) {
      throw new Error('Source or target dataset not found in catalog');
    }

    const sourceId = sourceResult.rows[0].id;
    const targetId = targetResult.rows[0].id;

    const result = await this.pool.query(
      `
      INSERT INTO catalog.lineage_edges (
        source_dataset_id, target_dataset_id, transformation_type,
        transformation_description, job_name, column_mappings
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (source_dataset_id, target_dataset_id, transformation_type)
      DO UPDATE SET
        last_seen_at = NOW(),
        run_count = lineage_edges.run_count + 1,
        transformation_description = COALESCE($4, lineage_edges.transformation_description),
        job_name = COALESCE($5, lineage_edges.job_name),
        column_mappings = COALESCE($6, lineage_edges.column_mappings)
      RETURNING *
    `,
      [
        sourceId,
        targetId,
        transformationType,
        transformationDescription,
        jobName,
        columnMappings ? JSON.stringify(columnMappings) : null,
      ],
    );

    logger.info({
      message: 'Lineage edge recorded',
      source: sourceDatasetId,
      target: targetDatasetId,
      transformation: transformationType,
    });

    return this.rowToLineageEdge(result.rows[0]);
  }

  /**
   * Get lineage graph for a dataset
   */
  async getLineage(
    datasetId: string,
    options?: LineageQueryOptions,
  ): Promise<LineageGraph> {
    const maxDepth = options?.maxDepth || 10;
    const direction = options?.direction || 'both';

    // Get dataset UUID
    const datasetResult = await this.pool.query(
      `SELECT id FROM catalog.datasets WHERE dataset_id = $1`,
      [datasetId],
    );

    if (datasetResult.rows.length === 0) {
      throw new Error(`Dataset ${datasetId} not found in catalog`);
    }

    const datasetUuid = datasetResult.rows[0].id;

    let upstream: LineageEdge[] = [];
    let downstream: LineageEdge[] = [];

    if (direction === 'upstream' || direction === 'both') {
      // Recursive CTE for upstream lineage
      const upstreamResult = await this.pool.query(
        `
        WITH RECURSIVE upstream_lineage AS (
          -- Base case: direct upstream
          SELECT le.*, 1 as depth,
                 s.dataset_id as source_dataset_id_str,
                 t.dataset_id as target_dataset_id_str
          FROM catalog.lineage_edges le
          JOIN catalog.datasets s ON le.source_dataset_id = s.id
          JOIN catalog.datasets t ON le.target_dataset_id = t.id
          WHERE le.target_dataset_id = $1

          UNION

          -- Recursive case: traverse upstream
          SELECT le.*, ul.depth + 1,
                 s.dataset_id as source_dataset_id_str,
                 t.dataset_id as target_dataset_id_str
          FROM catalog.lineage_edges le
          JOIN upstream_lineage ul ON le.target_dataset_id = ul.source_dataset_id
          JOIN catalog.datasets s ON le.source_dataset_id = s.id
          JOIN catalog.datasets t ON le.target_dataset_id = t.id
          WHERE ul.depth < $2
        )
        SELECT * FROM upstream_lineage
      `,
        [datasetUuid, maxDepth],
      );

      upstream = upstreamResult.rows.map((row) => this.rowToLineageEdge(row));
    }

    if (direction === 'downstream' || direction === 'both') {
      // Recursive CTE for downstream lineage
      const downstreamResult = await this.pool.query(
        `
        WITH RECURSIVE downstream_lineage AS (
          -- Base case: direct downstream
          SELECT le.*, 1 as depth,
                 s.dataset_id as source_dataset_id_str,
                 t.dataset_id as target_dataset_id_str
          FROM catalog.lineage_edges le
          JOIN catalog.datasets s ON le.source_dataset_id = s.id
          JOIN catalog.datasets t ON le.target_dataset_id = t.id
          WHERE le.source_dataset_id = $1

          UNION

          -- Recursive case: traverse downstream
          SELECT le.*, dl.depth + 1,
                 s.dataset_id as source_dataset_id_str,
                 t.dataset_id as target_dataset_id_str
          FROM catalog.lineage_edges le
          JOIN downstream_lineage dl ON le.source_dataset_id = dl.target_dataset_id
          JOIN catalog.datasets s ON le.source_dataset_id = s.id
          JOIN catalog.datasets t ON le.target_dataset_id = t.id
          WHERE dl.depth < $2
        )
        SELECT * FROM downstream_lineage
      `,
        [datasetUuid, maxDepth],
      );

      downstream = downstreamResult.rows.map((row) => this.rowToLineageEdge(row));
    }

    return {
      dataset: datasetId,
      upstream,
      downstream,
      generatedAt: new Date(),
    };
  }

  /**
   * Log dataset access
   */
  async logAccess(
    datasetId: string,
    userId: string,
    accessType: AccessType,
    accessGranted: boolean,
    context?: {
      accessMethod?: string;
      authorityBindingType?: string;
      clearanceLevel?: number;
      reasonForAccess?: string;
      queryHash?: string;
      rowCount?: number;
      bytesAccessed?: number;
      denialReason?: string;
    },
  ): Promise<void> {
    // Get dataset UUID
    const datasetResult = await this.pool.query(
      `SELECT id FROM catalog.datasets WHERE dataset_id = $1`,
      [datasetId],
    );

    if (datasetResult.rows.length === 0) {
      throw new Error(`Dataset ${datasetId} not found in catalog`);
    }

    const datasetUuid = datasetResult.rows[0].id;

    await this.pool.query(
      `
      INSERT INTO catalog.dataset_access_log (
        dataset_id, user_id, access_type, access_method,
        authority_binding_type, clearance_level, reason_for_access,
        query_hash, row_count, bytes_accessed,
        access_granted, denial_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        datasetUuid,
        userId,
        accessType,
        context?.accessMethod,
        context?.authorityBindingType,
        context?.clearanceLevel,
        context?.reasonForAccess,
        context?.queryHash,
        context?.rowCount,
        context?.bytesAccessed,
        accessGranted,
        context?.denialReason,
      ],
    );

    logger.info({
      message: 'Dataset access logged',
      datasetId,
      userId,
      accessType,
      accessGranted,
    });
  }

  /**
   * Record quality metrics for a dataset
   */
  async recordQualityMetrics(
    datasetId: string,
    metrics: Omit<QualityMetrics, 'id' | 'datasetId' | 'measuredAt'>,
  ): Promise<void> {
    // Get dataset UUID
    const datasetResult = await this.pool.query(
      `SELECT id FROM catalog.datasets WHERE dataset_id = $1`,
      [datasetId],
    );

    if (datasetResult.rows.length === 0) {
      throw new Error(`Dataset ${datasetId} not found in catalog`);
    }

    const datasetUuid = datasetResult.rows[0].id;

    await this.pool.query(
      `
      INSERT INTO catalog.quality_metrics (
        dataset_id, completeness_score, validity_score, consistency_score,
        timeliness_score, accuracy_score, null_percentage, duplicate_percentage,
        outlier_count, schema_violations_count, measurement_job, sample_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        datasetUuid,
        metrics.completenessScore,
        metrics.validityScore,
        metrics.consistencyScore,
        metrics.timelinessScore,
        metrics.accuracyScore,
        metrics.nullPercentage,
        metrics.duplicatePercentage,
        metrics.outlierCount,
        metrics.schemaViolationsCount,
        metrics.measurementJob,
        metrics.sampleSize,
      ],
    );

    // Update overall data quality score on dataset
    const overallScore =
      (metrics.completenessScore || 0) +
      (metrics.validityScore || 0) +
      (metrics.consistencyScore || 0) +
      (metrics.timelinessScore || 0) +
      (metrics.accuracyScore || 0);
    const scoreCount = [
      metrics.completenessScore,
      metrics.validityScore,
      metrics.consistencyScore,
      metrics.timelinessScore,
      metrics.accuracyScore,
    ].filter((s) => s !== undefined).length;

    if (scoreCount > 0) {
      await this.pool.query(
        `UPDATE catalog.datasets SET data_quality_score = $1 WHERE id = $2`,
        [overallScore / scoreCount, datasetUuid],
      );
    }

    logger.info({
      message: 'Quality metrics recorded',
      datasetId,
      overallScore: scoreCount > 0 ? overallScore / scoreCount : null,
    });
  }

  /**
   * Get catalog statistics
   */
  async getStats(): Promise<CatalogStats> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_datasets,
        COUNT(*) FILTER (WHERE contains_personal_data = true) as datasets_with_pii,
        COUNT(*) FILTER (WHERE deprecated_at IS NOT NULL) as deprecated_datasets,
        COALESCE(SUM(record_count), 0) as total_records,
        COALESCE(AVG(data_quality_score), 0) as average_quality_score
      FROM catalog.datasets
      WHERE deleted_at IS NULL
    `);

    const typeStats = await this.pool.query(`
      SELECT data_type, COUNT(*) as count
      FROM catalog.datasets
      WHERE deleted_at IS NULL
      GROUP BY data_type
    `);

    const classificationStats = await this.pool.query(`
      SELECT classification_level, COUNT(*) as count
      FROM catalog.datasets
      WHERE deleted_at IS NULL
      GROUP BY classification_level
    `);

    const storageStats = await this.pool.query(`
      SELECT storage_system, COUNT(*) as count
      FROM catalog.datasets
      WHERE deleted_at IS NULL
      GROUP BY storage_system
    `);

    const stats = result.rows[0];

    return {
      totalDatasets: parseInt(stats.total_datasets),
      datasetsByType: typeStats.rows.reduce(
        (acc, row) => {
          acc[row.data_type] = parseInt(row.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      datasetsByClassification: classificationStats.rows.reduce(
        (acc, row) => {
          acc[row.classification_level] = parseInt(row.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      datasetsByStorageSystem: storageStats.rows.reduce(
        (acc, row) => {
          acc[row.storage_system] = parseInt(row.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      datasetsWithPII: parseInt(stats.datasets_with_pii),
      deprecatedDatasets: parseInt(stats.deprecated_datasets),
      totalRecords: parseInt(stats.total_records),
      averageQualityScore: parseFloat(stats.average_quality_score),
      lastUpdated: new Date(),
    };
  }

  /**
   * Helper: Convert DB row to DatasetMetadata
   */
  private rowToDatasetMetadata(row: any): DatasetMetadata {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      name: row.name,
      description: row.description,
      dataType: row.data_type,
      classificationLevel: row.classification_level,
      containsPersonalData: row.contains_personal_data,
      containsFinancialData: row.contains_financial_data,
      containsHealthData: row.contains_health_data,
      ownerTeam: row.owner_team,
      ownerEmail: row.owner_email,
      jurisdiction: row.jurisdiction,
      tags: row.tags,
      storageSystem: row.storage_system,
      storageLocation: row.storage_location,
      storageMetadata: row.storage_metadata,
      schemaDefinition: row.schema_definition,
      schemaVersion: row.schema_version,
      licenseId: row.license_id,
      contractReferences: row.contract_references,
      authorityRequirements: row.authority_requirements,
      openlineageNamespace: row.openlineage_namespace,
      openlineageName: row.openlineage_name,
      upstreamDatasets: row.upstream_datasets,
      downstreamDatasets: row.downstream_datasets,
      recordCount: row.record_count,
      lastUpdatedAt: row.last_updated_at,
      dataQualityScore: row.data_quality_score ? parseFloat(row.data_quality_score) : undefined,
      retentionDays: row.retention_days,
      retentionPolicyId: row.retention_policy_id,
      archivalLocation: row.archival_location,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      deprecatedAt: row.deprecated_at,
      deletedAt: row.deleted_at,
    };
  }

  /**
   * Helper: Convert DB row to CatalogEntry
   */
  private rowToCatalogEntry(row: any): CatalogEntry {
    return {
      datasetId: row.dataset_id,
      name: row.name,
      description: row.description,
      dataType: row.data_type,
      classificationLevel: row.classification_level,
      ownerTeam: row.owner_team,
      ownerEmail: row.owner_email,
      storageSystem: row.storage_system,
      storageLocation: row.storage_location,
      containsPersonalData: row.contains_personal_data,
      containsFinancialData: row.contains_financial_data,
      containsHealthData: row.contains_health_data,
      tags: row.tags,
      recordCount: row.record_count,
      lastUpdatedAt: row.last_updated_at,
      dataQualityScore: row.data_quality_score ? parseFloat(row.data_quality_score) : undefined,
      schemaVersion: row.schema_version,
      downstreamCount: parseInt(row.downstream_count),
      upstreamCount: parseInt(row.upstream_count),
      createdAt: row.created_at,
      isDeprecated: row.is_deprecated,
    };
  }

  /**
   * Helper: Convert DB row to LineageEdge
   */
  private rowToLineageEdge(row: any): LineageEdge {
    return {
      id: row.id,
      sourceDatasetId: row.source_dataset_id_str || row.source_dataset_id,
      targetDatasetId: row.target_dataset_id_str || row.target_dataset_id,
      transformationType: row.transformation_type,
      transformationDescription: row.transformation_description,
      jobName: row.job_name,
      columnMappings: row.column_mappings,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      runCount: row.run_count,
    };
  }
}

// Singleton instance
let catalogServiceInstance: CatalogService | null = null;

/**
 * Get or create catalog service singleton
 */
export function getCatalogService(pool?: Pool): CatalogService {
  if (!catalogServiceInstance && !pool) {
    throw new Error('CatalogService not initialized. Provide a database pool.');
  }

  if (pool && !catalogServiceInstance) {
    catalogServiceInstance = new CatalogService(pool);
  }

  return catalogServiceInstance!;
}

export default CatalogService;
