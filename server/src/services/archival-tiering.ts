/**
 * Data Archival Tiering Service
 * Implements automatic data tiering to S3 Standard, S3-IA, and Glacier
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Pool as PgPool } from 'pg';
import * as zlib from 'zlib';
import { promisify } from 'util';
import logger from '../utils/logger.js';
import {
  archivalJobsTotal,
  archivalDataSize,
  archivalLatency,
  archivalCost,
} from '../observability/metrics-enhanced.js';
import { costGuardService } from '../observability/cost-guards.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Configuration
interface ArchivalConfig {
  enabled: boolean;
  s3Bucket: string;
  s3Region: string;
  archivalRules: ArchivalRule[];
  compressionEnabled: boolean;
  checkIntervalHours: number;
}

interface ArchivalRule {
  name: string;
  tableName: string;
  ageThresholdDays: number;
  targetTier: 'S3_STANDARD' | 'S3_STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  dateColumn: string;
  compressionRatio?: number; // Expected compression ratio (for cost estimation)
}

const DEFAULT_CONFIG: ArchivalConfig = {
  enabled: process.env.ARCHIVAL_ENABLED === 'true',
  s3Bucket: process.env.ARCHIVAL_S3_BUCKET || 'intelgraph-archives',
  s3Region: process.env.AWS_REGION || 'us-east-1',
  compressionEnabled: process.env.ARCHIVAL_COMPRESSION !== 'false',
  checkIntervalHours: parseInt(process.env.ARCHIVAL_CHECK_INTERVAL_HOURS || '24', 10),
  archivalRules: [
    // Events older than 90 days -> S3-IA
    {
      name: 'events_to_s3_ia',
      tableName: 'events',
      ageThresholdDays: 90,
      targetTier: 'S3_STANDARD_IA',
      dateColumn: 'timestamp',
      compressionRatio: 0.3,
    },
    // Events older than 365 days -> Glacier
    {
      name: 'events_to_glacier',
      tableName: 'events',
      ageThresholdDays: 365,
      targetTier: 'GLACIER',
      dateColumn: 'timestamp',
      compressionRatio: 0.3,
    },
    // Analytics traces older than 180 days -> S3-IA
    {
      name: 'analytics_to_s3_ia',
      tableName: 'analytics_traces',
      ageThresholdDays: 180,
      targetTier: 'S3_STANDARD_IA',
      dateColumn: 'timestamp',
      compressionRatio: 0.4,
    },
    // Audit logs older than 2 years -> Glacier Deep Archive
    {
      name: 'audit_to_deep_archive',
      tableName: 'audit_log',
      ageThresholdDays: 730,
      targetTier: 'DEEP_ARCHIVE',
      dateColumn: 'created_at',
      compressionRatio: 0.25,
    },
  ],
};

interface ArchivalJob {
  id: string;
  ruleName: string;
  tableName: string;
  rowsArchived: number;
  bytesArchived: number;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Archival Tiering Service
 */
export class ArchivalTieringService {
  private config: ArchivalConfig;
  private s3Client: S3Client;
  private pgPool: PgPool | null;
  private checkInterval: NodeJS.Timeout | null;
  private activeJobs: Map<string, ArchivalJob>;

  constructor(config: Partial<ArchivalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.s3Client = new S3Client({ region: this.config.s3Region });
    this.pgPool = null;
    this.checkInterval = null;
    this.activeJobs = new Map();
  }

  /**
   * Initialize with database connection
   */
  initialize(pgPool: PgPool) {
    this.pgPool = pgPool;

    if (this.config.enabled) {
      this.start();
      logger.info('Archival Tiering Service initialized', {
        bucket: this.config.s3Bucket,
        region: this.config.s3Region,
        rules: this.config.archivalRules.length,
      });
    } else {
      logger.info('Archival Tiering Service is disabled');
    }
  }

  /**
   * Start the archival checker
   */
  start() {
    if (this.checkInterval) {
      return; // Already running
    }

    // Run immediately, then on interval
    this.runArchivalCycle().catch((err) =>
      logger.error('Error in initial archival cycle', err)
    );

    this.checkInterval = setInterval(
      () => this.runArchivalCycle(),
      this.config.checkIntervalHours * 60 * 60 * 1000
    );

    logger.info('Archival Tiering Service started');
  }

  /**
   * Stop the archival checker
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Archival Tiering Service stopped');
    }
  }

  /**
   * Run a full archival cycle for all rules
   */
  async runArchivalCycle(): Promise<void> {
    logger.info('Starting archival cycle', {
      rules: this.config.archivalRules.length,
    });

    for (const rule of this.config.archivalRules) {
      try {
        await this.executeArchivalRule(rule);
      } catch (error) {
        logger.error({
          rule: rule.name,
          error: (error as Error).message,
          msg: 'Error executing archival rule',
        });
      }
    }

    logger.info('Archival cycle completed');
  }

  /**
   * Execute a single archival rule
   */
  async executeArchivalRule(rule: ArchivalRule): Promise<ArchivalJob> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const jobId = `${rule.name}_${Date.now()}`;
    const job: ArchivalJob = {
      id: jobId,
      ruleName: rule.name,
      tableName: rule.tableName,
      rowsArchived: 0,
      bytesArchived: 0,
      startTime: new Date(),
      status: 'running',
    };

    this.activeJobs.set(jobId, job);

    logger.info({
      jobId,
      rule: rule.name,
      table: rule.tableName,
      ageThreshold: `${rule.ageThresholdDays} days`,
      tier: rule.targetTier,
      msg: 'Starting archival job',
    });

    const startTime = Date.now();

    try {
      // Find old data to archive
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - rule.ageThresholdDays);

      const countResult = await this.pgPool.query(
        `SELECT COUNT(*) as count
         FROM ${rule.tableName}
         WHERE ${rule.dateColumn} < $1`,
        [cutoffDate]
      );

      const rowCount = parseInt(countResult.rows[0].count, 10);

      if (rowCount === 0) {
        logger.info({
          jobId,
          rule: rule.name,
          msg: 'No rows to archive',
        });

        job.status = 'completed';
        job.endTime = new Date();
        return job;
      }

      logger.info({
        jobId,
        rule: rule.name,
        rowsToArchive: rowCount,
        msg: 'Found rows to archive',
      });

      // Fetch data in batches
      const batchSize = 10000;
      let offset = 0;
      let totalBytes = 0;

      while (offset < rowCount) {
        const result = await this.pgPool.query(
          `SELECT *
           FROM ${rule.tableName}
           WHERE ${rule.dateColumn} < $1
           ORDER BY ${rule.dateColumn}
           LIMIT $2 OFFSET $3`,
          [cutoffDate, batchSize, offset]
        );

        if (result.rows.length === 0) {
          break;
        }

        // Archive batch to S3
        const batchData = JSON.stringify(result.rows);
        const bytes = await this.archiveBatch(
          rule,
          jobId,
          offset,
          batchData
        );

        totalBytes += bytes;
        offset += result.rows.length;

        logger.debug({
          jobId,
          rule: rule.name,
          progress: `${offset}/${rowCount}`,
          bytes,
          msg: 'Batch archived',
        });
      }

      // Delete archived data from primary database
      const deleteResult = await this.pgPool.query(
        `DELETE FROM ${rule.tableName}
         WHERE ${rule.dateColumn} < $1`,
        [cutoffDate]
      );

      job.rowsArchived = deleteResult.rowCount || 0;
      job.bytesArchived = totalBytes;
      job.status = 'completed';
      job.endTime = new Date();

      const durationSeconds = (Date.now() - startTime) / 1000;

      // Record metrics
      archivalJobsTotal.inc({
        storage_tier: rule.targetTier,
        status: 'success',
      });

      archivalDataSize.set(
        {
          storage_tier: rule.targetTier,
          data_type: rule.tableName,
        },
        totalBytes
      );

      archivalLatency.observe(
        {
          storage_tier: rule.targetTier,
          data_type: rule.tableName,
        },
        durationSeconds
      );

      // Calculate and record cost
      const cost = this.estimateArchivalCost(totalBytes, rule.targetTier);
      archivalCost.inc({ storage_tier: rule.targetTier }, cost);
      costGuardService.recordStorageCost(
        totalBytes / (1024 * 1024 * 1024), // Convert to GB
        this.mapTierToCostType(rule.targetTier),
        'system'
      );

      logger.info({
        jobId,
        rule: rule.name,
        rowsArchived: job.rowsArchived,
        bytesArchived: totalBytes,
        durationSeconds: durationSeconds.toFixed(2),
        cost: `$${cost.toFixed(4)}`,
        msg: 'Archival job completed',
      });

      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.endTime = new Date();

      archivalJobsTotal.inc({
        storage_tier: rule.targetTier,
        status: 'failed',
      });

      logger.error({
        jobId,
        rule: rule.name,
        error: (error as Error).message,
        msg: 'Archival job failed',
      });

      throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Archive a batch of data to S3
   */
  private async archiveBatch(
    rule: ArchivalRule,
    jobId: string,
    batchOffset: number,
    data: string
  ): Promise<number> {
    const key = `${rule.tableName}/${jobId}/batch_${batchOffset}.json${this.config.compressionEnabled ? '.gz' : ''}`;

    let buffer = Buffer.from(data, 'utf-8');
    const uncompressedSize = buffer.length;

    // Compress if enabled
    if (this.config.compressionEnabled) {
      buffer = await gzip(buffer);
    }

    const compressedSize = buffer.length;

    // Upload to S3
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: buffer,
        StorageClass: rule.targetTier,
        Metadata: {
          jobId,
          ruleName: rule.name,
          tableName: rule.tableName,
          batchOffset: batchOffset.toString(),
          uncompressedSize: uncompressedSize.toString(),
          compressedSize: compressedSize.toString(),
        },
      },
    });

    await upload.done();

    logger.debug({
      key,
      uncompressedSize,
      compressedSize,
      compressionRatio: (compressedSize / uncompressedSize).toFixed(2),
      storageClass: rule.targetTier,
      msg: 'Batch uploaded to S3',
    });

    return compressedSize;
  }

  /**
   * Restore archived data
   */
  async restoreArchivedData(
    tableName: string,
    jobId: string,
    targetTable?: string
  ): Promise<number> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const prefix = `${tableName}/${jobId}/`;
    let totalRows = 0;

    // List all objects for this job (simplified - production would use pagination)
    logger.info({
      prefix,
      msg: 'Starting restore from S3',
    });

    // For each batch file, download and restore
    // This is a simplified implementation - production would need proper listing
    const batchFiles = await this.listS3Objects(prefix);

    for (const file of batchFiles) {
      const rows = await this.restoreBatch(file, targetTable || tableName);
      totalRows += rows;
    }

    logger.info({
      jobId,
      tableName,
      totalRows,
      msg: 'Restore completed',
    });

    return totalRows;
  }

  /**
   * Restore a single batch
   */
  private async restoreBatch(s3Key: string, tableName: string): Promise<number> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    // Download from S3
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);
    let buffer = await this.streamToBuffer(response.Body as any);

    // Decompress if needed
    if (s3Key.endsWith('.gz')) {
      buffer = await gunzip(buffer);
    }

    const data = JSON.parse(buffer.toString('utf-8'));

    // Insert into database
    if (!Array.isArray(data) || data.length === 0) {
      return 0;
    }

    // Build INSERT statement
    const columns = Object.keys(data[0]);
    const values = data.map((row) => columns.map((col) => row[col]));

    // Batch insert (simplified - production would use proper batch insertion)
    for (const rowValues of values) {
      const placeholders = rowValues.map((_, i) => `$${i + 1}`).join(', ');
      await this.pgPool.query(
        `INSERT INTO ${tableName} (${columns.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT DO NOTHING`,
        rowValues
      );
    }

    return data.length;
  }

  /**
   * List S3 objects (simplified)
   */
  private async listS3Objects(prefix: string): Promise<string[]> {
    // Simplified implementation - production would use S3 ListObjectsV2
    return [];
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Estimate archival cost
   */
  private estimateArchivalCost(bytes: number, tier: string): number {
    const gb = bytes / (1024 * 1024 * 1024);

    const costPerGbMonth: Record<string, number> = {
      S3_STANDARD: 0.023,
      S3_STANDARD_IA: 0.0125,
      GLACIER: 0.004,
      DEEP_ARCHIVE: 0.00099,
    };

    const monthlyCost = gb * (costPerGbMonth[tier] || 0.023);
    return monthlyCost / 30; // Daily cost
  }

  /**
   * Map tier to cost type
   */
  private mapTierToCostType(tier: string): 's3_standard' | 's3_ia' | 'glacier' {
    switch (tier) {
      case 'S3_STANDARD':
        return 's3_standard';
      case 'S3_STANDARD_IA':
      case 'DEEP_ARCHIVE':
        return 's3_ia';
      case 'GLACIER':
        return 'glacier';
      default:
        return 's3_standard';
    }
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): ArchivalJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get configuration
   */
  getConfig(): ArchivalConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ArchivalConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Archival Tiering configuration updated', this.config);
  }
}

// Singleton instance
export const archivalTieringService = new ArchivalTieringService();

export default archivalTieringService;
