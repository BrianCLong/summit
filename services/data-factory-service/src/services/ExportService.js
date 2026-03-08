"use strict";
// @ts-nocheck
/**
 * Data Factory Service - Export Service
 *
 * Handles dataset exports in various formats with versioning and policy compliance.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const uuid_1 = require("uuid");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const url_1 = require("url");
const crypto_1 = require("crypto");
const promises_2 = require("stream/promises");
const stream_1 = require("stream");
const connection_js_1 = require("../db/connection.js");
const index_js_1 = require("../types/index.js");
const pino_1 = __importDefault(require("pino"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
const logger = (0, pino_1.default)({ name: 'export-service' });
const EXPORT_DIR = process.env.EXPORT_DIR || (0, path_1.join)(__dirname, '../../exports');
class ExportService {
    auditService;
    governanceService;
    datasetService;
    constructor(auditService, governanceService, datasetService) {
        this.auditService = auditService;
        this.governanceService = governanceService;
        this.datasetService = datasetService;
    }
    async createExport(datasetId, format, policyProfileId, exportedBy, options) {
        const dataset = await this.datasetService.getById(datasetId);
        if (!dataset) {
            throw new Error(`Dataset not found: ${datasetId}`);
        }
        // Check eligibility
        const eligibility = await this.governanceService.checkDatasetEligibility(dataset, 'export', exportedBy);
        if (!eligibility.eligible) {
            throw new Error(`Dataset not eligible for export: ${eligibility.reasons.join(', ')}`);
        }
        const exportId = (0, uuid_1.v4)();
        const redactionRules = await this.governanceService.getRedactionRulesForPolicy(policyProfileId);
        const result = await (0, connection_js_1.query)(`INSERT INTO dataset_exports (
        id, dataset_id, dataset_version, format, splits, filter_criteria,
        redaction_rules, status, exported_by, policy_profile_id, export_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
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
        ]);
        const exportRecord = this.mapRowToExport(result.rows[0]);
        await this.auditService.log({
            entityType: 'export',
            entityId: exportId,
            action: 'create',
            actorId: exportedBy,
            actorRole: 'user',
            newState: exportRecord,
            metadata: { datasetId, format },
        });
        // Start async export process
        this.processExport(exportId).catch((error) => {
            logger.error({ error, exportId }, 'Export processing failed');
        });
        logger.info({ exportId, datasetId, format }, 'Export created');
        return exportRecord;
    }
    async getExport(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM dataset_exports WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToExport(result.rows[0]);
    }
    async getExportsForDataset(datasetId) {
        const result = await (0, connection_js_1.query)('SELECT * FROM dataset_exports WHERE dataset_id = $1 ORDER BY created_at DESC', [datasetId]);
        return result.rows.map((row) => this.mapRowToExport(row));
    }
    async getExportFile(id) {
        const exportRecord = await this.getExport(id);
        if (!exportRecord || !exportRecord.filePath) {
            return null;
        }
        if (exportRecord.status !== 'completed') {
            throw new Error(`Export not completed: ${exportRecord.status}`);
        }
        const contentTypes = {
            jsonl: 'application/jsonl',
            parquet: 'application/octet-stream',
            csv: 'text/csv',
            json: 'application/json',
        };
        return {
            stream: (0, fs_1.createReadStream)(exportRecord.filePath),
            filename: `${exportRecord.datasetId}_${exportRecord.datasetVersion}.${exportRecord.format}`,
            contentType: contentTypes[exportRecord.format],
        };
    }
    async processExport(exportId) {
        const exportRecord = await this.getExport(exportId);
        if (!exportRecord) {
            throw new Error(`Export not found: ${exportId}`);
        }
        try {
            // Update status to processing
            await (0, connection_js_1.query)(`UPDATE dataset_exports SET status = 'processing' WHERE id = $1`, [exportId]);
            const dataset = await this.datasetService.getById(exportRecord.datasetId);
            if (!dataset) {
                throw new Error(`Dataset not found: ${exportRecord.datasetId}`);
            }
            // Fetch samples with filters
            const samples = await this.fetchSamplesForExport(exportRecord.datasetId, exportRecord.splits, exportRecord.filterCriteria || undefined);
            // Apply redactions
            const redactedSamples = await this.applyRedactions(samples, exportRecord.redactionRules);
            // Ensure export directory exists
            await (0, promises_1.mkdir)(EXPORT_DIR, { recursive: true });
            // Generate export file
            const filename = `${exportRecord.datasetId}_${exportRecord.datasetVersion}_${exportId}.${exportRecord.format}`;
            const filePath = (0, path_1.join)(EXPORT_DIR, filename);
            const { fileSize, fileHash } = await this.writeExportFile(redactedSamples, filePath, exportRecord.format, dataset);
            // Calculate split distribution
            const splitDistribution = {
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
            const metadata = {
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
            await (0, connection_js_1.query)(`UPDATE dataset_exports SET
          status = 'completed',
          file_path = $1,
          file_size = $2,
          file_hash = $3,
          sample_count = $4,
          export_metadata = $5,
          completed_at = NOW()
         WHERE id = $6`, [filePath, fileSize, fileHash, redactedSamples.length, JSON.stringify(metadata), exportId]);
            await this.auditService.log({
                entityType: 'export',
                entityId: exportId,
                action: 'complete',
                actorId: 'system',
                actorRole: 'system',
                metadata: { sampleCount: redactedSamples.length, fileSize, fileHash },
            });
            logger.info({ exportId, sampleCount: redactedSamples.length, fileSize }, 'Export completed');
        }
        catch (error) {
            await (0, connection_js_1.query)(`UPDATE dataset_exports SET status = 'failed' WHERE id = $1`, [exportId]);
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
    async fetchSamplesForExport(datasetId, splits, filter) {
        const conditions = ['dataset_id = $1', 'status IN ($2, $3)'];
        const values = [datasetId, index_js_1.LabelStatus.COMPLETED, index_js_1.LabelStatus.APPROVED];
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
        const result = await (0, connection_js_1.query)(`SELECT s.* FROM samples s WHERE ${conditions.join(' AND ')}`, values);
        // Fetch labels for each sample
        const samples = [];
        for (const row of result.rows) {
            const labelsResult = await (0, connection_js_1.query)(`SELECT id, labels, confidence, status FROM label_sets
         WHERE sample_id = $1 AND status IN ($2, $3)`, [row.id, index_js_1.LabelStatus.COMPLETED, index_js_1.LabelStatus.APPROVED]);
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
                    annotatorRole: 'annotator',
                    taskType: 'text_classification',
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
    async applyRedactions(samples, rules) {
        if (rules.length === 0) {
            return samples;
        }
        return Promise.all(samples.map(async (sample) => {
            const redactedContent = await this.governanceService.applyRedaction(sample.content, rules);
            return {
                ...sample,
                content: redactedContent,
            };
        }));
    }
    async writeExportFile(samples, filePath, format, dataset) {
        const hash = (0, crypto_1.createHash)('sha256');
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
    async writeJSONL(samples, filePath, hash) {
        const writeStream = (0, fs_1.createWriteStream)(filePath);
        const transform = new stream_1.Transform({
            objectMode: true,
            transform(sample, _encoding, callback) {
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
        const readable = stream_1.Readable.from(samples);
        await (0, promises_2.pipeline)(readable, transform, writeStream);
        const stats = await (0, promises_1.stat)(filePath);
        return {
            fileSize: stats.size,
            fileHash: hash.digest('hex'),
        };
    }
    async writeJSON(samples, filePath, hash, dataset) {
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
        const writeStream = (0, fs_1.createWriteStream)(filePath);
        writeStream.write(content);
        writeStream.end();
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        const stats = await (0, promises_1.stat)(filePath);
        return {
            fileSize: stats.size,
            fileHash: hash.digest('hex'),
        };
    }
    async writeCSV(samples, filePath, hash) {
        const writeStream = (0, fs_1.createWriteStream)(filePath);
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
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        const stats = await (0, promises_1.stat)(filePath);
        return {
            fileSize: stats.size,
            fileHash: hash.digest('hex'),
        };
    }
    async deleteExport(id, deletedBy) {
        const exportRecord = await this.getExport(id);
        if (!exportRecord) {
            throw new Error(`Export not found: ${id}`);
        }
        if (exportRecord.filePath) {
            try {
                await (0, promises_1.unlink)(exportRecord.filePath);
            }
            catch {
                logger.warn({ exportId: id }, 'Failed to delete export file');
            }
        }
        await (0, connection_js_1.query)('DELETE FROM dataset_exports WHERE id = $1', [id]);
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
    mapRowToExport(row) {
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
exports.ExportService = ExportService;
