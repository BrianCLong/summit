/**
 * Data Factory Service - Sample Service
 *
 * Manages samples within datasets: creation, querying, and status management.
 */

import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { query, transaction } from '../db/connection.js';
import {
  Sample,
  LabelStatus,
  SplitType,
  CreateSampleRequest,
  PaginationParams,
  PaginatedResponse,
  LabelSet,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import pino from 'pino';

const logger = pino({ name: 'sample-service' });

export class SampleService {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  async create(request: CreateSampleRequest, createdBy: string): Promise<Sample> {
    const id = uuidv4();
    const contentString = JSON.stringify(request.content);
    const contentHash = CryptoJS.SHA256(contentString).toString();
    const contentSize = Buffer.byteLength(contentString, 'utf-8');

    const result = await query<{
      id: string;
      dataset_id: string;
      external_id: string | null;
      content: string;
      source_id: string;
      source_name: string;
      collection_date: Date;
      original_format: string;
      content_hash: string;
      content_size: number;
      language: string | null;
      domain: string | null;
      custom_fields: string;
      split: SplitType | null;
      status: LabelStatus;
      is_golden: boolean;
      expected_label: string | null;
      priority: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO samples (
        id, dataset_id, external_id, content, source_id, source_name,
        collection_date, original_format, content_hash, content_size,
        language, domain, custom_fields, is_golden, expected_label, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        request.datasetId,
        request.externalId || null,
        JSON.stringify(request.content),
        request.metadata.sourceId,
        request.metadata.sourceName,
        request.metadata.collectionDate,
        request.metadata.originalFormat,
        contentHash,
        contentSize,
        request.metadata.language || null,
        request.metadata.domain || null,
        JSON.stringify(request.metadata.customFields || {}),
        request.isGolden || false,
        request.expectedLabel ? JSON.stringify(request.expectedLabel) : null,
        request.priority || 50,
      ]
    );

    const sample = this.mapRowToSample(result.rows[0]);

    await this.auditService.log({
      entityType: 'sample',
      entityId: id,
      action: 'create',
      actorId: createdBy,
      actorRole: 'user',
      newState: sample as unknown as Record<string, unknown>,
      metadata: { datasetId: request.datasetId },
    });

    logger.info({ sampleId: id, datasetId: request.datasetId }, 'Sample created');
    return sample;
  }

  async createBatch(
    datasetId: string,
    samples: Array<Omit<CreateSampleRequest, 'datasetId'>>,
    createdBy: string
  ): Promise<{ created: number; errors: Array<{ index: number; error: string }> }> {
    const errors: Array<{ index: number; error: string }> = [];
    let created = 0;

    await transaction(async (client) => {
      for (let i = 0; i < samples.length; i++) {
        try {
          const sample = samples[i];
          const id = uuidv4();
          const contentString = JSON.stringify(sample.content);
          const contentHash = CryptoJS.SHA256(contentString).toString();
          const contentSize = Buffer.byteLength(contentString, 'utf-8');

          await client.query(
            `INSERT INTO samples (
              id, dataset_id, external_id, content, source_id, source_name,
              collection_date, original_format, content_hash, content_size,
              language, domain, custom_fields, is_golden, expected_label, priority
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              id,
              datasetId,
              sample.externalId || null,
              JSON.stringify(sample.content),
              sample.metadata.sourceId,
              sample.metadata.sourceName,
              sample.metadata.collectionDate,
              sample.metadata.originalFormat,
              contentHash,
              contentSize,
              sample.metadata.language || null,
              sample.metadata.domain || null,
              JSON.stringify(sample.metadata.customFields || {}),
              sample.isGolden || false,
              sample.expectedLabel ? JSON.stringify(sample.expectedLabel) : null,
              sample.priority || 50,
            ]
          );
          created++;
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    await this.auditService.log({
      entityType: 'sample',
      entityId: datasetId,
      action: 'batch_create',
      actorId: createdBy,
      actorRole: 'user',
      metadata: { created, errors: errors.length },
    });

    logger.info(
      { datasetId, created, errors: errors.length },
      'Batch sample creation completed'
    );
    return { created, errors };
  }

  async getById(id: string): Promise<Sample | null> {
    const result = await query<{
      id: string;
      dataset_id: string;
      external_id: string | null;
      content: string;
      source_id: string;
      source_name: string;
      collection_date: Date;
      original_format: string;
      content_hash: string;
      content_size: number;
      language: string | null;
      domain: string | null;
      custom_fields: string;
      split: SplitType | null;
      status: LabelStatus;
      is_golden: boolean;
      expected_label: string | null;
      priority: number;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM samples WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const sample = this.mapRowToSample(result.rows[0]);
    sample.labels = await this.getLabelsForSample(id);
    return sample;
  }

  async list(
    datasetId: string,
    params: PaginationParams,
    filters?: {
      status?: LabelStatus;
      split?: SplitType;
      isGolden?: boolean;
      minPriority?: number;
    }
  ): Promise<PaginatedResponse<Sample>> {
    const conditions: string[] = ['dataset_id = $1'];
    const values: unknown[] = [datasetId];
    let paramIndex = 2;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters?.split) {
      conditions.push(`split = $${paramIndex++}`);
      values.push(filters.split);
    }
    if (filters?.isGolden !== undefined) {
      conditions.push(`is_golden = $${paramIndex++}`);
      values.push(filters.isGolden);
    }
    if (filters?.minPriority !== undefined) {
      conditions.push(`priority >= $${paramIndex++}`);
      values.push(filters.minPriority);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM samples ${whereClause}`,
      values
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const offset = (params.page - 1) * params.pageSize;
    const sortColumn = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';

    const dataResult = await query<{
      id: string;
      dataset_id: string;
      external_id: string | null;
      content: string;
      source_id: string;
      source_name: string;
      collection_date: Date;
      original_format: string;
      content_hash: string;
      content_size: number;
      language: string | null;
      domain: string | null;
      custom_fields: string;
      split: SplitType | null;
      status: LabelStatus;
      is_golden: boolean;
      expected_label: string | null;
      priority: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM samples ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, params.pageSize, offset]
    );

    const samples = dataResult.rows.map((row) => this.mapRowToSample(row));

    return {
      data: samples,
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

  async updateStatus(
    id: string,
    status: LabelStatus,
    updatedBy: string
  ): Promise<Sample> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Sample not found: ${id}`);
    }

    await query('UPDATE samples SET status = $1 WHERE id = $2', [status, id]);

    const updated = await this.getById(id);

    await this.auditService.log({
      entityType: 'sample',
      entityId: id,
      action: 'update_status',
      actorId: updatedBy,
      actorRole: 'user',
      previousState: { status: existing.status },
      newState: { status },
      metadata: {},
    });

    logger.debug({ sampleId: id, status }, 'Sample status updated');
    return updated!;
  }

  async updateSplit(
    id: string,
    split: SplitType,
    updatedBy: string
  ): Promise<Sample> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Sample not found: ${id}`);
    }

    await query('UPDATE samples SET split = $1 WHERE id = $2', [split, id]);

    const updated = await this.getById(id);

    await this.auditService.log({
      entityType: 'sample',
      entityId: id,
      action: 'update_split',
      actorId: updatedBy,
      actorRole: 'user',
      previousState: { split: existing.split },
      newState: { split },
      metadata: {},
    });

    return updated!;
  }

  async updatePriority(
    id: string,
    priority: number,
    updatedBy: string
  ): Promise<Sample> {
    if (priority < 0 || priority > 100) {
      throw new Error('Priority must be between 0 and 100');
    }

    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Sample not found: ${id}`);
    }

    await query('UPDATE samples SET priority = $1 WHERE id = $2', [priority, id]);

    return (await this.getById(id))!;
  }

  async markAsGolden(
    id: string,
    expectedLabel: Record<string, unknown>,
    updatedBy: string
  ): Promise<Sample> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Sample not found: ${id}`);
    }

    await query(
      'UPDATE samples SET is_golden = true, expected_label = $1 WHERE id = $2',
      [JSON.stringify(expectedLabel), id]
    );

    const updated = await this.getById(id);

    await this.auditService.log({
      entityType: 'sample',
      entityId: id,
      action: 'mark_golden',
      actorId: updatedBy,
      actorRole: 'user',
      newState: { isGolden: true, expectedLabel },
      metadata: {},
    });

    logger.info({ sampleId: id }, 'Sample marked as golden');
    return updated!;
  }

  async getGoldenSamples(
    datasetId: string,
    limit: number = 10
  ): Promise<Sample[]> {
    const result = await query<{
      id: string;
      dataset_id: string;
      external_id: string | null;
      content: string;
      source_id: string;
      source_name: string;
      collection_date: Date;
      original_format: string;
      content_hash: string;
      content_size: number;
      language: string | null;
      domain: string | null;
      custom_fields: string;
      split: SplitType | null;
      status: LabelStatus;
      is_golden: boolean;
      expected_label: string | null;
      priority: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM samples
       WHERE dataset_id = $1 AND is_golden = true
       ORDER BY RANDOM()
       LIMIT $2`,
      [datasetId, limit]
    );

    return result.rows.map((row) => this.mapRowToSample(row));
  }

  async getNextForLabeling(
    datasetId: string,
    annotatorId: string,
    count: number = 1
  ): Promise<Sample[]> {
    // Get samples that need labeling, prioritizing:
    // 1. Higher priority
    // 2. Fewer existing labels
    // 3. Not already labeled by this annotator
    const result = await query<{
      id: string;
      dataset_id: string;
      external_id: string | null;
      content: string;
      source_id: string;
      source_name: string;
      collection_date: Date;
      original_format: string;
      content_hash: string;
      content_size: number;
      language: string | null;
      domain: string | null;
      custom_fields: string;
      split: SplitType | null;
      status: LabelStatus;
      is_golden: boolean;
      expected_label: string | null;
      priority: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT s.* FROM samples s
       LEFT JOIN label_sets ls ON s.id = ls.sample_id AND ls.annotator_id = (
         SELECT id FROM annotators WHERE user_id = $2
       )
       WHERE s.dataset_id = $1
         AND s.status IN ('pending', 'in_progress')
         AND ls.id IS NULL
       ORDER BY s.priority DESC, s.created_at ASC
       LIMIT $3`,
      [datasetId, annotatorId, count]
    );

    return result.rows.map((row) => this.mapRowToSample(row));
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Sample not found: ${id}`);
    }

    await query('DELETE FROM samples WHERE id = $1', [id]);

    await this.auditService.log({
      entityType: 'sample',
      entityId: id,
      action: 'delete',
      actorId: deletedBy,
      actorRole: 'user',
      previousState: existing as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ sampleId: id }, 'Sample deleted');
  }

  async deleteBatch(
    datasetId: string,
    sampleIds: string[],
    deletedBy: string
  ): Promise<number> {
    const result = await query(
      'DELETE FROM samples WHERE id = ANY($1) AND dataset_id = $2',
      [sampleIds, datasetId]
    );

    await this.auditService.log({
      entityType: 'sample',
      entityId: datasetId,
      action: 'batch_delete',
      actorId: deletedBy,
      actorRole: 'user',
      metadata: { count: result.rowCount },
    });

    logger.info(
      { datasetId, count: result.rowCount },
      'Batch sample deletion completed'
    );
    return result.rowCount || 0;
  }

  async getStatistics(datasetId: string): Promise<{
    total: number;
    byStatus: Record<LabelStatus, number>;
    bySplit: Record<SplitType, number>;
    goldenCount: number;
    averagePriority: number;
  }> {
    const statusResult = await query<{ status: LabelStatus; count: string }>(
      `SELECT status, COUNT(*) as count FROM samples
       WHERE dataset_id = $1 GROUP BY status`,
      [datasetId]
    );

    const splitResult = await query<{ split: SplitType; count: string }>(
      `SELECT split, COUNT(*) as count FROM samples
       WHERE dataset_id = $1 AND split IS NOT NULL GROUP BY split`,
      [datasetId]
    );

    const statsResult = await query<{
      total: string;
      golden_count: string;
      avg_priority: string;
    }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_golden THEN 1 ELSE 0 END) as golden_count,
         AVG(priority) as avg_priority
       FROM samples WHERE dataset_id = $1`,
      [datasetId]
    );

    const byStatus = {} as Record<LabelStatus, number>;
    for (const row of statusResult.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    const bySplit = {} as Record<SplitType, number>;
    for (const row of splitResult.rows) {
      bySplit[row.split] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(statsResult.rows[0].total, 10),
      byStatus,
      bySplit,
      goldenCount: parseInt(statsResult.rows[0].golden_count, 10),
      averagePriority: parseFloat(statsResult.rows[0].avg_priority) || 0,
    };
  }

  private async getLabelsForSample(sampleId: string): Promise<LabelSet[]> {
    const result = await query<{
      id: string;
      sample_id: string;
      annotator_id: string;
      annotator_role: string;
      task_type: string;
      labels: string;
      confidence: number | null;
      notes: string | null;
      time_spent: number;
      status: LabelStatus;
      reviewer_id: string | null;
      review_notes: string | null;
      reviewed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM label_sets WHERE sample_id = $1', [sampleId]);

    return result.rows.map((row) => ({
      id: row.id,
      sampleId: row.sample_id,
      annotatorId: row.annotator_id,
      annotatorRole: row.annotator_role as LabelSet['annotatorRole'],
      taskType: row.task_type as LabelSet['taskType'],
      labels: JSON.parse(row.labels),
      confidence: row.confidence || undefined,
      notes: row.notes || undefined,
      timeSpent: row.time_spent,
      status: row.status,
      reviewerId: row.reviewer_id || undefined,
      reviewNotes: row.review_notes || undefined,
      reviewedAt: row.reviewed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private mapRowToSample(row: {
    id: string;
    dataset_id: string;
    external_id: string | null;
    content: string;
    source_id: string;
    source_name: string;
    collection_date: Date;
    original_format: string;
    content_hash: string;
    content_size: number;
    language: string | null;
    domain: string | null;
    custom_fields: string;
    split: SplitType | null;
    status: LabelStatus;
    is_golden: boolean;
    expected_label: string | null;
    priority: number;
    created_at: Date;
    updated_at: Date;
  }): Sample {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      externalId: row.external_id || undefined,
      content: JSON.parse(row.content),
      metadata: {
        sourceId: row.source_id,
        sourceName: row.source_name,
        collectionDate: row.collection_date,
        originalFormat: row.original_format,
        hash: row.content_hash,
        size: row.content_size,
        language: row.language || undefined,
        domain: row.domain || undefined,
        customFields: JSON.parse(row.custom_fields),
      },
      labels: [],
      split: row.split || undefined,
      status: row.status,
      isGolden: row.is_golden,
      expectedLabel: row.expected_label ? JSON.parse(row.expected_label) : undefined,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
