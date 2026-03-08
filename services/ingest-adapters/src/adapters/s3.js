"use strict";
/**
 * S3 Adapter
 *
 * Polls S3 buckets for new objects and processes them as ingest records.
 * Supports JSONL, JSON, CSV, and Parquet formats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Adapter = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const papaparse_1 = require("papaparse");
const base_js_1 = require("./base.js");
const dedupe_js_1 = require("../lib/dedupe.js");
class S3Adapter extends base_js_1.BaseAdapter {
    client = null;
    pollTimer = null;
    lastProcessedKey = null;
    processing = false;
    constructor(options) {
        super(options);
    }
    get s3Config() {
        return this.config;
    }
    async doInitialize() {
        this.client = new client_s3_1.S3Client({
            region: this.s3Config.region,
            ...(this.s3Config.endpoint && { endpoint: this.s3Config.endpoint }),
        });
        // Verify bucket access
        try {
            await this.client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.s3Config.bucket,
                Prefix: this.s3Config.prefix,
                MaxKeys: 1,
            }));
        }
        catch (error) {
            throw new Error(`Failed to access S3 bucket ${this.s3Config.bucket}: ${error}`);
        }
        // Restore checkpoint
        const checkpoint = await this.getCheckpoint();
        if (checkpoint) {
            this.lastProcessedKey = checkpoint.position;
            this.logger.info({ lastKey: this.lastProcessedKey }, 'Restored checkpoint');
        }
    }
    async doStart() {
        const pollInterval = this.config.polling_interval_ms ?? 30000;
        // Initial poll
        await this.poll();
        // Start polling timer
        this.pollTimer = setInterval(async () => {
            if (!this.processing && this.running) {
                await this.poll();
            }
        }, pollInterval);
    }
    async doStop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        // Wait for any in-progress processing
        while (this.processing) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    async doHealthCheck() {
        if (!this.client) {
            return { healthy: false, details: { error: 'S3 client not initialized' } };
        }
        try {
            await this.client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.s3Config.bucket,
                Prefix: this.s3Config.prefix,
                MaxKeys: 1,
            }));
            return {
                healthy: true,
                details: {
                    bucket: this.s3Config.bucket,
                    prefix: this.s3Config.prefix,
                    lastProcessedKey: this.lastProcessedKey,
                },
            };
        }
        catch (error) {
            return {
                healthy: false,
                details: {
                    bucket: this.s3Config.bucket,
                    error: String(error),
                },
            };
        }
    }
    getSourceIdentifier() {
        return `s3://${this.s3Config.bucket}/${this.s3Config.prefix ?? ''}`;
    }
    createCheckpoint(position) {
        return {
            id: `${this.config.tenant_id}:${this.getSourceIdentifier()}`,
            tenant_id: this.config.tenant_id,
            source: this.getSourceIdentifier(),
            source_type: 's3',
            position,
            last_processed_at: new Date().toISOString(),
            records_since_checkpoint: 0,
            total_records_processed: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    async poll() {
        if (!this.client || !this.backpressure.isAccepting()) {
            return;
        }
        this.processing = true;
        try {
            const objects = await this.listNewObjects();
            for (const obj of objects) {
                if (!this.running || !this.backpressure.isAccepting()) {
                    break;
                }
                await this.processObject(obj);
                this.lastProcessedKey = obj.key;
                // Save checkpoint
                await this.setCheckpoint(this.createCheckpoint(obj.key));
            }
        }
        catch (error) {
            this.logger.error({ error }, 'Error during S3 poll');
        }
        finally {
            this.processing = false;
        }
    }
    async listNewObjects() {
        const objects = [];
        let continuationToken;
        do {
            const response = await this.client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.s3Config.bucket,
                Prefix: this.s3Config.prefix,
                StartAfter: this.lastProcessedKey ?? undefined,
                MaxKeys: this.config.max_batch_size ?? 1000,
                ContinuationToken: continuationToken,
            }));
            for (const content of response.Contents ?? []) {
                if (!content.Key || !content.Size)
                    continue;
                // Apply file pattern filter if configured
                if (this.s3Config.file_pattern) {
                    const pattern = new RegExp(this.s3Config.file_pattern);
                    if (!pattern.test(content.Key))
                        continue;
                }
                objects.push({
                    key: content.Key,
                    size: content.Size,
                    lastModified: content.LastModified ?? new Date(),
                    etag: content.ETag ?? '',
                });
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken && objects.length < (this.config.max_batch_size ?? 1000));
        // Sort by key to ensure consistent ordering
        objects.sort((a, b) => a.key.localeCompare(b.key));
        return objects;
    }
    async processObject(obj) {
        this.logger.info({ key: obj.key, size: obj.size }, 'Processing S3 object');
        try {
            const content = await this.downloadObject(obj.key);
            const checksum = await (0, dedupe_js_1.computeFileChecksum)(content);
            const format = this.detectFormat(obj.key);
            const records = await this.parseContent(content, format);
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                if (!record)
                    continue;
                const envelope = this.createEnvelopeFromRecord(record, obj.key, checksum, i, records.length);
                await this.processRecord(envelope);
            }
            // Delete after processing if configured
            if (this.s3Config.delete_after_process) {
                await this.deleteObject(obj.key);
                this.logger.debug({ key: obj.key }, 'Deleted processed S3 object');
            }
        }
        catch (error) {
            this.logger.error({ key: obj.key, error }, 'Error processing S3 object');
            throw error;
        }
    }
    async downloadObject(key) {
        const response = await this.client.send(new client_s3_1.GetObjectCommand({
            Bucket: this.s3Config.bucket,
            Key: key,
        }));
        if (!response.Body) {
            throw new Error(`Empty response body for ${key}`);
        }
        // Convert stream to buffer
        const stream = response.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    async deleteObject(key) {
        await this.client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: this.s3Config.bucket,
            Key: key,
        }));
    }
    detectFormat(key) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.endsWith('.jsonl') || lowerKey.endsWith('.ndjson')) {
            return 'jsonl';
        }
        if (lowerKey.endsWith('.json')) {
            return 'json';
        }
        if (lowerKey.endsWith('.csv')) {
            return 'csv';
        }
        if (lowerKey.endsWith('.parquet')) {
            return 'parquet';
        }
        // Default to JSONL
        return 'jsonl';
    }
    async parseContent(content, format) {
        const text = content.toString('utf-8');
        switch (format) {
            case 'jsonl':
                return this.parseJSONL(text);
            case 'json':
                const parsed = JSON.parse(text);
                return Array.isArray(parsed) ? parsed : [parsed];
            case 'csv':
                return this.parseCSV(text);
            case 'parquet':
                // Parquet parsing would require parquetjs-lite
                this.logger.warn('Parquet parsing not yet implemented');
                return [];
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    parseJSONL(text) {
        const records = [];
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                try {
                    records.push(JSON.parse(trimmed));
                }
                catch (error) {
                    this.logger.warn({ line: trimmed.substring(0, 100) }, 'Failed to parse JSONL line');
                }
            }
        }
        return records;
    }
    parseCSV(text) {
        const result = (0, papaparse_1.parse)(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        });
        if (result.errors.length > 0) {
            this.logger.warn({ errors: result.errors }, 'CSV parsing had errors');
        }
        return result.data;
    }
    createEnvelopeFromRecord(record, key, checksum, sequence, batchSize) {
        // Try to extract entity info from record
        const entityType = record['_type'] ?? record['type'] ?? 'unknown';
        const entityId = record['_id'] ?? record['id'] ?? `${key}:${sequence}`;
        const revision = record['_revision'] ?? record['revision'] ?? 1;
        const envelope = this.createEnvelope(record, entityType, entityId, revision, `s3://${this.s3Config.bucket}/${key}`);
        // Add S3-specific metadata
        envelope.ingest.file_path = key;
        envelope.ingest.file_checksum = checksum;
        envelope.ingest.batch_sequence = sequence;
        envelope.ingest.batch_size = batchSize;
        envelope.ingest.format = this.detectFormat(key);
        return envelope;
    }
}
exports.S3Adapter = S3Adapter;
