"use strict";
// @ts-nocheck
/**
 * Data Archival Tiering Service
 * Implements automatic data tiering to S3 Standard, S3-IA, and Glacier
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archivalTieringService = exports.ArchivalTieringService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_enhanced_js_1 = require("../observability/metrics-enhanced.js");
const cost_guards_js_1 = require("../observability/cost-guards.js");
const gzip = (0, util_1.promisify)(zlib.gzip);
const gunzip = (0, util_1.promisify)(zlib.gunzip);
const DEFAULT_CONFIG = {
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
/**
 * Archival Tiering Service
 */
class ArchivalTieringService {
    config;
    s3Client;
    pgPool;
    checkInterval;
    activeJobs;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.s3Client = new client_s3_1.S3Client({ region: this.config.s3Region });
        this.pgPool = null;
        this.checkInterval = null;
        this.activeJobs = new Map();
    }
    /**
     * Initialize with database connection
     */
    initialize(pgPool) {
        this.pgPool = pgPool;
        if (this.config.enabled) {
            this.start();
            logger_js_1.default.info('Archival Tiering Service initialized', {
                bucket: this.config.s3Bucket,
                region: this.config.s3Region,
                rules: this.config.archivalRules.length,
            });
        }
        else {
            logger_js_1.default.info('Archival Tiering Service is disabled');
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
        this.runArchivalCycle().catch((err) => logger_js_1.default.error('Error in initial archival cycle', err));
        this.checkInterval = setInterval(() => this.runArchivalCycle(), this.config.checkIntervalHours * 60 * 60 * 1000);
        logger_js_1.default.info('Archival Tiering Service started');
    }
    /**
     * Stop the archival checker
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger_js_1.default.info('Archival Tiering Service stopped');
        }
    }
    /**
     * Run a full archival cycle for all rules
     */
    async runArchivalCycle() {
        logger_js_1.default.info('Starting archival cycle', {
            rules: this.config.archivalRules.length,
        });
        for (const rule of this.config.archivalRules) {
            try {
                await this.executeArchivalRule(rule);
            }
            catch (error) {
                logger_js_1.default.error({
                    rule: rule.name,
                    error: error.message,
                    msg: 'Error executing archival rule',
                });
            }
        }
        logger_js_1.default.info('Archival cycle completed');
    }
    /**
     * Execute a single archival rule
     */
    async executeArchivalRule(rule) {
        if (!this.pgPool) {
            throw new Error('PostgreSQL pool not initialized');
        }
        const jobId = `${rule.name}_${Date.now()}`;
        const job = {
            id: jobId,
            ruleName: rule.name,
            tableName: rule.tableName,
            rowsArchived: 0,
            bytesArchived: 0,
            startTime: new Date(),
            status: 'running',
        };
        this.activeJobs.set(jobId, job);
        logger_js_1.default.info({
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
            const countResult = await this.pgPool.query(`SELECT COUNT(*) as count
         FROM ${rule.tableName}
         WHERE ${rule.dateColumn} < $1`, [cutoffDate]);
            const rowCount = parseInt(countResult.rows[0].count, 10);
            if (rowCount === 0) {
                logger_js_1.default.info({
                    jobId,
                    rule: rule.name,
                    msg: 'No rows to archive',
                });
                job.status = 'completed';
                job.endTime = new Date();
                return job;
            }
            logger_js_1.default.info({
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
                const result = await this.pgPool.query(`SELECT *
           FROM ${rule.tableName}
           WHERE ${rule.dateColumn} < $1
           ORDER BY ${rule.dateColumn}
           LIMIT $2 OFFSET $3`, [cutoffDate, batchSize, offset]);
                if (result.rows.length === 0) {
                    break;
                }
                // Archive batch to S3
                const batchData = JSON.stringify(result.rows);
                const bytes = await this.archiveBatch(rule, jobId, offset, batchData);
                totalBytes += bytes;
                offset += result.rows.length;
                logger_js_1.default.debug({
                    jobId,
                    rule: rule.name,
                    progress: `${offset}/${rowCount}`,
                    bytes,
                    msg: 'Batch archived',
                });
            }
            // Delete archived data from primary database
            const deleteResult = await this.pgPool.query(`DELETE FROM ${rule.tableName}
         WHERE ${rule.dateColumn} < $1`, [cutoffDate]);
            job.rowsArchived = deleteResult.rowCount || 0;
            job.bytesArchived = totalBytes;
            job.status = 'completed';
            job.endTime = new Date();
            const durationSeconds = (Date.now() - startTime) / 1000;
            // Record metrics
            metrics_enhanced_js_1.archivalJobsTotal.inc({
                storage_tier: rule.targetTier,
                status: 'success',
            });
            metrics_enhanced_js_1.archivalDataSize.set({
                storage_tier: rule.targetTier,
                data_type: rule.tableName,
            }, totalBytes);
            metrics_enhanced_js_1.archivalLatency.observe({
                storage_tier: rule.targetTier,
                data_type: rule.tableName,
            }, durationSeconds);
            // Calculate and record cost
            const cost = this.estimateArchivalCost(totalBytes, rule.targetTier);
            metrics_enhanced_js_1.archivalCost.inc({ storage_tier: rule.targetTier }, cost);
            cost_guards_js_1.costGuardService.recordStorageCost(totalBytes / (1024 * 1024 * 1024), // Convert to GB
            this.mapTierToCostType(rule.targetTier), 'system');
            logger_js_1.default.info({
                jobId,
                rule: rule.name,
                rowsArchived: job.rowsArchived,
                bytesArchived: totalBytes,
                durationSeconds: durationSeconds.toFixed(2),
                cost: `$${cost.toFixed(4)}`,
                msg: 'Archival job completed',
            });
            return job;
        }
        catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.endTime = new Date();
            metrics_enhanced_js_1.archivalJobsTotal.inc({
                storage_tier: rule.targetTier,
                status: 'failed',
            });
            logger_js_1.default.error({
                jobId,
                rule: rule.name,
                error: error.message,
                msg: 'Archival job failed',
            });
            throw error;
        }
        finally {
            this.activeJobs.delete(jobId);
        }
    }
    /**
     * Archive a batch of data to S3
     */
    async archiveBatch(rule, jobId, batchOffset, data) {
        const key = `${rule.tableName}/${jobId}/batch_${batchOffset}.json${this.config.compressionEnabled ? '.gz' : ''}`;
        let buffer = Buffer.from(data, 'utf-8');
        const uncompressedSize = buffer.length;
        // Compress if enabled
        if (this.config.compressionEnabled) {
            buffer = await gzip(buffer);
        }
        const compressedSize = buffer.length;
        // Upload to S3
        const upload = new lib_storage_1.Upload({
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
        logger_js_1.default.debug({
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
    async restoreArchivedData(tableName, jobId, targetTable) {
        if (!this.pgPool) {
            throw new Error('PostgreSQL pool not initialized');
        }
        const prefix = `${tableName}/${jobId}/`;
        let totalRows = 0;
        // List all objects for this job (simplified - production would use pagination)
        logger_js_1.default.info({
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
        logger_js_1.default.info({
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
    async restoreBatch(s3Key, tableName) {
        if (!this.pgPool) {
            throw new Error('PostgreSQL pool not initialized');
        }
        // Download from S3
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.config.s3Bucket,
            Key: s3Key,
        });
        const response = await this.s3Client.send(command);
        let buffer = await this.streamToBuffer(response.Body);
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
            await this.pgPool.query(`INSERT INTO ${tableName} (${columns.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT DO NOTHING`, rowValues);
        }
        return data.length;
    }
    /**
     * List S3 objects (simplified)
     */
    async listS3Objects(prefix) {
        // Simplified implementation - production would use S3 ListObjectsV2
        return [];
    }
    /**
     * Convert stream to buffer
     */
    async streamToBuffer(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    /**
     * Estimate archival cost
     */
    estimateArchivalCost(bytes, tier) {
        const gb = bytes / (1024 * 1024 * 1024);
        const costPerGbMonth = {
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
    mapTierToCostType(tier) {
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
    getActiveJobs() {
        return Array.from(this.activeJobs.values());
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        logger_js_1.default.info('Archival Tiering configuration updated', this.config);
    }
}
exports.ArchivalTieringService = ArchivalTieringService;
// Singleton instance
exports.archivalTieringService = new ArchivalTieringService();
exports.default = exports.archivalTieringService;
