"use strict";
// Maestro Conductor v24.3.0 - Google Cloud Storage Connector
// Epic E15: New Connectors - GCS blob storage integration
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCSConnector = void 0;
// No-op tracer shim to avoid OTEL dependency
// GCS SDK loaded dynamically to avoid type resolution requirement during typecheck
const gcsLib = (() => {
    try {
        return require('@google-cloud/storage');
    }
    catch {
        return {};
    }
})();
const { Storage } = gcsLib;
const prom_client_1 = require("prom-client");
const events_1 = require("events");
const stream_1 = require("stream");
const tracer = {
    startActiveSpan: async (_name, fn) => {
        const span = {
            setAttributes: (_a) => { },
            recordException: (_e) => { },
            setStatus: (_s) => { },
            end: () => { },
        };
        return await fn(span);
    },
};
// Metrics
const gcsOperations = new prom_client_1.Counter({
    name: 'gcs_operations_total',
    help: 'Total GCS operations',
    labelNames: ['tenant_id', 'operation', 'bucket', 'result'],
});
const gcsLatency = new prom_client_1.Histogram({
    name: 'gcs_operation_latency_ms',
    help: 'GCS operation latency',
    buckets: [10, 50, 100, 500, 1000, 5000, 10000],
    labelNames: ['operation', 'bucket'],
});
const gcsObjectSize = new prom_client_1.Histogram({
    name: 'gcs_object_size_bytes',
    help: 'Size of GCS objects processed',
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
    labelNames: ['operation', 'bucket'],
});
const gcsConnections = new prom_client_1.Gauge({
    name: 'gcs_active_connections',
    help: 'Active GCS connections',
    labelNames: ['tenant_id'],
});
class GCSConnector extends events_1.EventEmitter {
    storage;
    bucket;
    config;
    tenantId;
    constructor(tenantId, config) {
        super();
        this.tenantId = tenantId;
        this.config = config;
        // Initialize Google Cloud Storage client
        this.storage = new Storage({
            projectId: config.projectId,
            keyFilename: config.keyFilename,
            credentials: config.credentials,
            retryOptions: {
                maxRetries: config.maxRetries || 3,
                retryDelayMultiplier: 2,
                totalTimeout: config.timeout || 60000,
                maxRetryDelay: 10000,
            },
        });
        this.bucket = this.storage.bucket(config.bucketName);
        gcsConnections.inc({ tenant_id: tenantId });
        this.emit('connected', { tenantId, bucket: config.bucketName });
    }
    async uploadObject(objectName, data, options = {}) {
        return tracer.startActiveSpan('gcs.upload_object', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_name: objectName,
                resumable: options.resumable || false,
            });
            const startTime = Date.now();
            try {
                const file = this.bucket.file(options.destination || objectName);
                const stream = file.createWriteStream({
                    metadata: {
                        contentType: options.contentType || 'application/octet-stream',
                        metadata: options.metadata,
                    },
                    resumable: options.resumable !== false,
                    public: options.public || false,
                    predefinedAcl: options.predefinedAcl,
                    encryptionKey: options.encryptionKey || this.config.encryptionKey,
                });
                return new Promise((resolve, reject) => {
                    stream.on('error', (error) => {
                        gcsOperations.inc({
                            tenant_id: this.tenantId,
                            operation: 'upload',
                            bucket: this.config.bucketName,
                            result: 'error',
                        });
                        span.recordException(error);
                        span.setStatus({ code: 2, message: error.message });
                        reject(error);
                    });
                    stream.on('finish', async () => {
                        try {
                            const [metadata] = await file.getMetadata();
                            const objectMetadata = this.mapGCSMetadata(metadata);
                            gcsObjectSize.observe({ operation: 'upload', bucket: this.config.bucketName }, objectMetadata.size);
                            gcsLatency.observe({ operation: 'upload', bucket: this.config.bucketName }, Date.now() - startTime);
                            gcsOperations.inc({
                                tenant_id: this.tenantId,
                                operation: 'upload',
                                bucket: this.config.bucketName,
                                result: 'success',
                            });
                            span.setAttributes({
                                object_size: objectMetadata.size,
                                content_type: objectMetadata.contentType,
                                storage_class: objectMetadata.storageClass,
                            });
                            this.emit('objectUploaded', {
                                tenantId: this.tenantId,
                                objectName,
                                metadata: objectMetadata,
                            });
                            resolve(objectMetadata);
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                    // Write data to stream
                    if (Buffer.isBuffer(data)) {
                        stream.end(data);
                    }
                    else if (data instanceof stream_1.Readable) {
                        data.pipe(stream);
                    }
                    else if (typeof data === 'string') {
                        stream.end(Buffer.from(data));
                    }
                    else {
                        reject(new Error('Unsupported data type'));
                    }
                });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'upload',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async downloadObject(objectName, options = {}) {
        return tracer.startActiveSpan('gcs.download_object', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_name: objectName,
                validation: options.validation !== false,
            });
            const startTime = Date.now();
            try {
                const file = this.bucket.file(objectName);
                // Check if file exists
                const [exists] = await file.exists();
                if (!exists) {
                    throw new Error(`Object ${objectName} not found`);
                }
                const downloadOptions = {
                    validation: options.validation !== false,
                    decompress: options.decompress !== false,
                };
                if (options.start !== undefined || options.end !== undefined) {
                    downloadOptions.start = options.start || 0;
                    downloadOptions.end = options.end;
                }
                const [data] = await file.download(downloadOptions);
                gcsObjectSize.observe({ operation: 'download', bucket: this.config.bucketName }, data.length);
                gcsLatency.observe({ operation: 'download', bucket: this.config.bucketName }, Date.now() - startTime);
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'download',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                span.setAttributes({
                    object_size: data.length,
                    range_request: options.start !== undefined || options.end !== undefined,
                });
                this.emit('objectDownloaded', {
                    tenantId: this.tenantId,
                    objectName,
                    size: data.length,
                });
                return data;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'download',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async downloadStream(objectName, options = {}) {
        return tracer.startActiveSpan('gcs.download_stream', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_name: objectName,
            });
            try {
                const file = this.bucket.file(objectName);
                const [exists] = await file.exists();
                if (!exists) {
                    throw new Error(`Object ${objectName} not found`);
                }
                const stream = file.createReadStream({
                    validation: options.validation !== false,
                    decompress: options.decompress !== false,
                    start: options.start,
                    end: options.end,
                });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'download_stream',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                return stream;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'download_stream',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async deleteObject(objectName) {
        return tracer.startActiveSpan('gcs.delete_object', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_name: objectName,
            });
            const startTime = Date.now();
            try {
                const file = this.bucket.file(objectName);
                await file.delete();
                gcsLatency.observe({ operation: 'delete', bucket: this.config.bucketName }, Date.now() - startTime);
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'delete',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                this.emit('objectDeleted', { tenantId: this.tenantId, objectName });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'delete',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async getObjectMetadata(objectName) {
        return tracer.startActiveSpan('gcs.get_metadata', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_name: objectName,
            });
            const startTime = Date.now();
            try {
                const file = this.bucket.file(objectName);
                const [metadata] = await file.getMetadata();
                gcsLatency.observe({ operation: 'metadata', bucket: this.config.bucketName }, Date.now() - startTime);
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'metadata',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                return this.mapGCSMetadata(metadata);
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'metadata',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async listObjects(options = {}) {
        return tracer.startActiveSpan('gcs.list_objects', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                prefix: options.prefix || '',
                max_results: options.maxResults || 1000,
            });
            const startTime = Date.now();
            try {
                const [files, , metadata] = await this.bucket.getFiles({
                    prefix: options.prefix,
                    delimiter: options.delimiter,
                    maxResults: options.maxResults || 1000,
                    pageToken: options.pageToken,
                    versions: options.versions || false,
                });
                const objects = files.map((file) => this.mapFileToMetadata(file));
                gcsLatency.observe({ operation: 'list', bucket: this.config.bucketName }, Date.now() - startTime);
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'list',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                span.setAttributes({
                    objects_count: objects.length,
                    has_next_page: !!metadata.nextPageToken,
                });
                return {
                    objects,
                    nextPageToken: metadata.nextPageToken,
                };
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'list',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async copyObject(sourceObject, destinationObject) {
        return tracer.startActiveSpan('gcs.copy_object', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                source_object: sourceObject,
                destination_object: destinationObject,
            });
            const startTime = Date.now();
            try {
                const sourceFile = this.bucket.file(sourceObject);
                const destinationFile = this.bucket.file(destinationObject);
                await sourceFile.copy(destinationFile);
                gcsLatency.observe({ operation: 'copy', bucket: this.config.bucketName }, Date.now() - startTime);
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'copy',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                this.emit('objectCopied', {
                    tenantId: this.tenantId,
                    sourceObject,
                    destinationObject,
                });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'copy',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async generateSignedUrl(objectName, action, expiresIn = 3600) {
        return tracer.startActiveSpan('gcs.generate_signed_url', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_name: objectName,
                action: action,
                expires_in: expiresIn,
            });
            try {
                const file = this.bucket.file(objectName);
                const expires = new Date();
                expires.setSeconds(expires.getSeconds() + expiresIn);
                const [url] = await file.getSignedUrl({
                    action,
                    expires,
                    version: 'v4',
                });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'signed_url',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                return url;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'signed_url',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    mapGCSMetadata(metadata) {
        return {
            name: metadata.name,
            bucket: metadata.bucket,
            size: parseInt(metadata.size, 10),
            contentType: metadata.contentType || 'application/octet-stream',
            md5Hash: metadata.md5Hash,
            crc32c: metadata.crc32c,
            etag: metadata.etag,
            timeCreated: new Date(metadata.timeCreated),
            updated: new Date(metadata.updated),
            storageClass: metadata.storageClass,
            metadata: metadata.metadata,
        };
    }
    mapFileToMetadata(file) {
        const metadata = file.metadata;
        return this.mapGCSMetadata(metadata);
    }
    async disconnect() {
        gcsConnections.dec({ tenant_id: this.tenantId });
        this.emit('disconnected', { tenantId: this.tenantId });
    }
    // Health check method
    async healthCheck() {
        const startTime = Date.now();
        try {
            await this.bucket.exists();
            const latency = Date.now() - startTime;
            return { healthy: true, latency };
        }
        catch (error) {
            return {
                healthy: false,
                latency: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    // Batch operations
    async batchDelete(objectNames) {
        return tracer.startActiveSpan('gcs.batch_delete', async (span) => {
            span.setAttributes({
                tenant_id: this.tenantId,
                bucket: this.config.bucketName,
                object_count: objectNames.length,
            });
            const startTime = Date.now();
            try {
                const deletePromises = objectNames.map((objectName) => this.bucket.file(objectName).delete());
                await Promise.all(deletePromises);
                gcsLatency.observe({ operation: 'batch_delete', bucket: this.config.bucketName }, Date.now() - startTime);
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'batch_delete',
                    bucket: this.config.bucketName,
                    result: 'success',
                });
                this.emit('batchDeleted', {
                    tenantId: this.tenantId,
                    objectNames,
                    count: objectNames.length,
                });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                gcsOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'batch_delete',
                    bucket: this.config.bucketName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    getTenantId() {
        return this.tenantId;
    }
    getBucketName() {
        return this.config.bucketName;
    }
    getProjectId() {
        return this.config.projectId;
    }
}
exports.GCSConnector = GCSConnector;
