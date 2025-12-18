/**
 * Data Factory Service - Export Service
 *
 * Handles dataset exports in various formats with versioning and policy compliance.
 */

import { v4 as uuidv4 } from 'uuid';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { Transform, Readable } from 'stream';
import { query, transaction } from '../db/connection.js';
import {
  DatasetExport,
  ExportFormat,
  ExportFilter,
  ExportMetadata,
  RedactionRule,
  SplitType,
  LabelStatus,
  Sample,
  Dataset,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import { GovernanceService } from './GovernanceService.js';
import { DatasetService } from './DatasetService.js';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = pino({ name: 'export-service' });

const EXPORT_DIR = process.env.EXPORT_DIR || join(__dirname, '../../exports');

export class ExportService {
  private auditService: AuditService;
  private governanceService: GovernanceService;
  private datasetService: DatasetService;

  constructor(
    auditService: AuditService,
    governanceService: GovernanceService,
    datasetService: DatasetService
  ) {
    this.auditService = auditService;
    this.governanceService = governanceService;
    this.datasetService = datasetService;
  }

  async createExport(
    datasetId: string,
    format: ExportFormat,
    policyProfileId: string,
    exportedBy: string,
    options?: {
      splits?: SplitType[];
      filterCriteria?: ExportFilter;
    }
  ): Promise<DatasetExport> {
    const dataset = await this.datasetService.getById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    // Check eligibility
    const eligibility = await this.governanceService.checkDatasetEligibility(
      dataset,
      'export',
      exportedBy
    );

    if (!eligibility.eligible) {
      throw new Error(
        `Dataset not eligible for export: ${eligibility.reasons.join(', ')}`
      );
    }

    const exportId = uuidv4();
    const redactionRules = await this.governanceService.getRedactionRulesForPolicy(
      policyProfileId
    );

    const result = await query<{
      id: string;
      dataset_id: string;
      dataset_version: string;
      format: ExportFormat;
      splits: string;
      filter_criteria: string | null;
      redaction_rules: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      file_path: string | null;
      file_size: number | null;
      file_hash: string | null;
      sample_count: number;
      exported_by: string;
      policy_profile_id: string;
      export_metadata: string;
      created_at: Date;
      completed_at: Date | null;
    }>(
      `INSERT INTO dataset_exports (
        id, dataset_id, dataset_version, format, splits, filter_criteria,
        redaction_rules, status, exported_by, policy_profile_id, export_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        exportId,
        datasetId,
        dataset.version,
        format,
        JSON.stringify(options?.splits || []),
        options?.filterCriteria ? JSON.stringify(options.filterCriteria) : null,
        JSON.stringify(redactionRules),
        'pending',
        exportedBy,
        policyProfileId,
        JSON.stringify({}),
      ]
    );

    const exportRecord = this.mapRowToExport(result.rows[0]);

    await this.auditService.log({
      entityType: 'export',
      entityId: exportId,
      action: 'create',
      actorId: exportedBy,
      actorRole: 'user',
      newState: exportRecord as unknown as Record<string, unknown>,
      metadata: { datasetId, format },
    });

    // Start async export process
    this.processExport(exportId).catch((error) => {
      logger.error({ error, exportId }, 'Export processing failed');
    });

    logger.info({ exportId, datasetId, format }, 'Export created');
    return exportRecord;
  }

  async getExport(id: string): Promise<DatasetExport | null> {
    const result = await query<{
      id: string;
      dataset_id: string;
      dataset_version: string;
      format: ExportFormat;
      splits: string;
      filter_criteria: string | null;
      redaction_rules: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      file_path: string | null;
      file_size: number | null;
      file_hash: string | null;
      sample_count: number;
      exported_by: string;
      policy_profile_id: string;
      export_metadata: string;
      created_at: Date;
      completed_at: Date | null;
    }>('SELECT * FROM dataset_exports WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExport(result.rows[0]);
  }

  async getExportsForDataset(datasetId: string): Promise<DatasetExport[]> {
    const result = await query<{
      id: string;
      dataset_id: string;
      dataset_version: string;
      format: ExportFormat;
      splits: string;
      filter_criteria: string | null;
      redaction_rules: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      file_path: string | null;
      file_size: number | null;
      file_hash: string | null;
      sample_count: number;
      exported_by: string;
      policy_profile_id: string;
      export_metadata: string;
      created_at: Date;
      completed_at: Date | null;
    }>(
      'SELECT * FROM dataset_exports WHERE dataset_id = $1 ORDER BY created_at DESC',
      [datasetId]
    );

    return result.rows.map((row) => this.mapRowToExport(row));
  }

  async getExportFile(id: string): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
  } | null> {
    const exportRecord = await this.getExport(id);
    if (!exportRecord || !exportRecord.filePath) {
      return null;
    }

    if (exportRecord.status !== 'completed') {
      throw new Error(`Export not completed: ${exportRecord.status}`);
    }

    const contentTypes: Record<ExportFormat, string> = {
      jsonl: 'application/jsonl',
      parquet: 'application/octet-stream',
      csv: 'text/csv',
      json: 'application/json',
    };

    return {
      stream: createReadStream(exportRecord.filePath),
      filename: `${exportRecord.datasetId}_${exportRecord.datasetVersion}.${exportRecord.format}`,
      contentType: contentTypes[exportRecord.format],
    };
  }

  private async processExport(exportId: string): Promise<void> {
    const exportRecord = await this.getExport(exportId);
    if (!exportRecord) {
      throw new Error(`Export not found: ${exportId}`);
    }

    try {
      // Update status to processing
      await query(
        `UPDATE dataset_exports SET status = 'processing' WHERE id = $1`,
        [exportId]
      );

      const dataset = await this.datasetService.getById(exportRecord.datasetId);
      if (!dataset) {
        throw new Error(`Dataset not found: ${exportRecord.datasetId}`);
      }

      // Fetch samples with filters
      const samples = await this.fetchSamplesForExport(
        exportRecord.datasetId,
        exportRecord.splits,
        exportRecord.filterCriteria || undefined
      );

      // Apply redactions
      const redactedSamples = await this.applyRedactions(
        samples,
        exportRecord.redactionRules
      );

      // Ensure export directory exists
      await mkdir(EXPORT_DIR, { recursive: true });

      // Generate export file
      const filename = `${exportRecord.datasetId}_${exportRecord.datasetVersion}_${exportId}.${exportRecord.format}`;
      const filePath = join(EXPORT_DIR, filename);

      const { fileSize, fileHash } = await this.writeExportFile(
        redactedSamples,
        filePath,
        exportRecord.format,
        dataset
      );

      // Calculate split distribution
      const splitDistribution: Record<SplitType, number> = {
        train: 0,
        dev: 0,
        test: 0,
        validation: 0,
      };
      for (const sample of redactedSamples) {
        if (sample.split) {
          splitDistribution[sample.split]++;
        }
      }

      const metadata: ExportMetadata = {
        datasetName: dataset.name,
        datasetVersion: dataset.version,
        exportTimestamp: new Date(),
        policyProfile: exportRecord.policyProfileId,
        modelTarget: dataset.modelTarget,
        useCase: dataset.useCase,
        schemaVersion: dataset.schema.version,
        checksum: fileHash,
        recordCount: redactedSamples.length,
        splitDistribution,
      };

      // Update export record
      await query(
        `UPDATE dataset_exports SET
          status = 'completed',
          file_path = $1,
          file_size = $2,
          file_hash = $3,
          sample_count = $4,
          export_metadata = $5,
          completed_at = NOW()
         WHERE id = $6`,
        [filePath, fileSize, fileHash, redactedSamples.length, JSON.stringify(metadata), exportId]
      );

      await this.auditService.log({
        entityType: 'export',
        entityId: exportId,
        action: 'complete',
        actorId: 'system',
        actorRole: 'system',
        metadata: { sampleCount: redactedSamples.length, fileSize, fileHash },
      });

      logger.info(
        { exportId, sampleCount: redactedSamples.length, fileSize },
        'Export completed'
      );
    } catch (error) {
      await query(
        `UPDATE dataset_exports SET status = 'failed' WHERE id = $1`,
        [exportId]
      );

      await this.auditService.log({
        entityType: 'export',
        entityId: exportId,
        action: 'fail',
        actorId: 'system',
        actorRole: 'system',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      throw error;
    }
  }

  private async fetchSamplesForExport(
    datasetId: string,
    splits: SplitType[],
    filter?: ExportFilter
  ): Promise<Sample[]> {
    const conditions: string[] = ['dataset_id = $1', 'status IN ($2, $3)'];
    const values: unknown[] = [datasetId, LabelStatus.COMPLETED, LabelStatus.APPROVED];
    let paramIndex = 4;

    if (splits && splits.length > 0) {
      conditions.push(`split = ANY($${paramIndex++})`);
      values.push(splits);
    }

    if (filter?.labelStatus && filter.labelStatus.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      values.push(filter.labelStatus);
    }

    if (filter?.minConfidence !== undefined) {
      // This would require joining with label_sets
    }

    if (filter?.dateRange) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filter.dateRange.start);
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filter.dateRange.end);
    }

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
      `SELECT s.* FROM samples s WHERE ${conditions.join(' AND ')}`,
      values
    );

    // Fetch labels for each sample
    const samples: Sample[] = [];
    for (const row of result.rows) {
      const labelsResult = await query<{
        id: string;
        labels: string;
        confidence: number | null;
        status: LabelStatus;
      }>(
        `SELECT id, labels, confidence, status FROM label_sets
         WHERE sample_id = $1 AND status IN ($2, $3)`,
        [row.id, LabelStatus.COMPLETED, LabelStatus.APPROVED]
      );

      samples.push({
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
        labels: labelsResult.rows.map((lr) => ({
          id: lr.id,
          sampleId: row.id,
          annotatorId: '',
          annotatorRole: 'annotator' as const,
          taskType: 'text_classification' as const,
          labels: JSON.parse(lr.labels),
          confidence: lr.confidence || undefined,
          timeSpent: 0,
          status: lr.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        split: row.split || undefined,
        status: row.status,
        isGolden: row.is_golden,
        expectedLabel: row.expected_label ? JSON.parse(row.expected_label) : undefined,
        priority: row.priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return samples;
  }

  private async applyRedactions(
    samples: Sample[],
    rules: RedactionRule[]
  ): Promise<Sample[]> {
    if (rules.length === 0) {
      return samples;
    }

    return Promise.all(
      samples.map(async (sample) => {
        const redactedContent = await this.governanceService.applyRedaction(
          sample.content as Record<string, unknown>,
          rules
        );
        return {
          ...sample,
          content: redactedContent,
        } as Sample;
      })
    );
  }

  private async writeExportFile(
    samples: Sample[],
    filePath: string,
    format: ExportFormat,
    dataset: Dataset
  ): Promise<{ fileSize: number; fileHash: string }> {
    const hash = createHash('sha256');

    switch (format) {
      case 'jsonl':
        return this.writeJSONL(samples, filePath, hash);
      case 'json':
        return this.writeJSON(samples, filePath, hash, dataset);
      case 'csv':
        return this.writeCSV(samples, filePath, hash);
      case 'parquet':
        // Parquet requires additional library setup
        return this.writeJSONL(samples, filePath.replace('.parquet', '.jsonl'), hash);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async writeJSONL(
    samples: Sample[],
    filePath: string,
    hash: ReturnType<typeof createHash>
  ): Promise<{ fileSize: number; fileHash: string }> {
    const writeStream = createWriteStream(filePath);

    const transform = new Transform({
      objectMode: true,
      transform(sample: Sample, _encoding, callback) {
        const record = {
          id: sample.id,
          content: sample.content,
          labels: sample.labels.map((l) => l.labels),
          split: sample.split,
          metadata: {
            source: sample.metadata.sourceName,
            language: sample.metadata.language,
            domain: sample.metadata.domain,
          },
        };
        const line = JSON.stringify(record) + '\n';
        hash.update(line);
        callback(null, line);
      },
    });

    const readable = Readable.from(samples);
    await pipeline(readable, transform, writeStream);

    const stats = await stat(filePath);
    return {
      fileSize: stats.size,
      fileHash: hash.digest('hex'),
    };
  }

  private async writeJSON(
    samples: Sample[],
    filePath: string,
    hash: ReturnType<typeof createHash>,
    dataset: Dataset
  ): Promise<{ fileSize: number; fileHash: string }> {
    const exportData = {
      metadata: {
        datasetName: dataset.name,
        version: dataset.version,
        exportDate: new Date().toISOString(),
        sampleCount: samples.length,
      },
      schema: dataset.schema,
      data: samples.map((sample) => ({
        id: sample.id,
        content: sample.content,
        labels: sample.labels.map((l) => l.labels),
        split: sample.split,
        metadata: {
          source: sample.metadata.sourceName,
          language: sample.metadata.language,
          domain: sample.metadata.domain,
        },
      })),
    };

    const content = JSON.stringify(exportData, null, 2);
    hash.update(content);

    const writeStream = createWriteStream(filePath);
    writeStream.write(content);
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = await stat(filePath);
    return {
      fileSize: stats.size,
      fileHash: hash.digest('hex'),
    };
  }

  private async writeCSV(
    samples: Sample[],
    filePath: string,
    hash: ReturnType<typeof createHash>
  ): Promise<{ fileSize: number; fileHash: string }> {
    const writeStream = createWriteStream(filePath);

    // Write header
    const header = 'id,content,labels,split,source,language,domain\n';
    hash.update(header);
    writeStream.write(header);

    // Write data
    for (const sample of samples) {
      const row = [
        sample.id,
        JSON.stringify(sample.content).replace(/"/g, '""'),
        JSON.stringify(sample.labels.map((l) => l.labels)).replace(/"/g, '""'),
        sample.split || '',
        sample.metadata.sourceName,
        sample.metadata.language || '',
        sample.metadata.domain || '',
      ]
        .map((v) => `"${v}"`)
        .join(',');
      const line = row + '\n';
      hash.update(line);
      writeStream.write(line);
    }

    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = await stat(filePath);
    return {
      fileSize: stats.size,
      fileHash: hash.digest('hex'),
    };
  }

  async deleteExport(id: string, deletedBy: string): Promise<void> {
    const exportRecord = await this.getExport(id);
    if (!exportRecord) {
      throw new Error(`Export not found: ${id}`);
    }

    if (exportRecord.filePath) {
      try {
        await unlink(exportRecord.filePath);
      } catch {
        logger.warn({ exportId: id }, 'Failed to delete export file');
      }
    }

    await query('DELETE FROM dataset_exports WHERE id = $1', [id]);

    await this.auditService.log({
      entityType: 'export',
      entityId: id,
      action: 'delete',
      actorId: deletedBy,
      actorRole: 'user',
      metadata: {},
    });

    logger.info({ exportId: id }, 'Export deleted');
  }

  private mapRowToExport(row: {
    id: string;
    dataset_id: string;
    dataset_version: string;
    format: ExportFormat;
    splits: string;
    filter_criteria: string | null;
    redaction_rules: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    file_path: string | null;
    file_size: number | null;
    file_hash: string | null;
    sample_count: number;
    exported_by: string;
    policy_profile_id: string;
    export_metadata: string;
    created_at: Date;
    completed_at: Date | null;
  }): DatasetExport {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      datasetVersion: row.dataset_version,
      format: row.format,
      splits: JSON.parse(row.splits),
      filterCriteria: row.filter_criteria ? JSON.parse(row.filter_criteria) : undefined,
      redactionRules: JSON.parse(row.redaction_rules),
      status: row.status,
      filePath: row.file_path || undefined,
      fileSize: row.file_size || undefined,
      fileHash: row.file_hash || undefined,
      sampleCount: row.sample_count,
      exportedBy: row.exported_by,
      policyProfileId: row.policy_profile_id,
      metadata: JSON.parse(row.export_metadata),
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    };
  }
}
