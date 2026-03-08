"use strict";
// Maestro Conductor v24.3.0 - Azure Blob Storage Connector
// Epic E15: New Connectors - Azure blob storage integration
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureConnector = void 0;
// No-op tracer shim to avoid OTEL dependency
// Azure SDK loaded dynamically to avoid type resolution requirement during typecheck
const azureBlob = (() => {
    try {
        return require('@azure/storage-blob');
    }
    catch {
        return {};
    }
})();
const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters, } = azureBlob;
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
const azureOperations = new prom_client_1.Counter({
    name: 'azure_operations_total',
    help: 'Total Azure Blob operations',
    labelNames: ['tenant_id', 'operation', 'container', 'result'],
});
const azureLatency = new prom_client_1.Histogram({
    name: 'azure_operation_latency_ms',
    help: 'Azure Blob operation latency',
    buckets: [10, 50, 100, 500, 1000, 5000, 10000],
    labelNames: ['operation', 'container'],
});
const azureBlobSize = new prom_client_1.Histogram({
    name: 'azure_blob_size_bytes',
    help: 'Size of Azure blobs processed',
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
    labelNames: ['operation', 'container'],
});
const azureConnections = new prom_client_1.Gauge({
    name: 'azure_active_connections',
    help: 'Active Azure Blob connections',
    labelNames: ['tenant_id'],
});
class AzureConnector extends events_1.EventEmitter {
    blobServiceClient;
    containerClient;
    config;
    tenantId;
    constructor(tenantId, config) {
        super();
        this.tenantId = tenantId;
        this.config = config;
        try {
            // Initialize Azure Blob Service Client
            if (config.connectionString) {
                this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
            }
            else if (config.sasToken) {
                const blobServiceUri = config.endpoint ||
                    `https://${config.accountName}.blob.core.windows.net`;
                this.blobServiceClient = new BlobServiceClient(`${blobServiceUri}?${config.sasToken}`);
            }
            else if (config.accountKey) {
                const credential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
                const blobServiceUri = config.endpoint ||
                    `https://${config.accountName}.blob.core.windows.net`;
                this.blobServiceClient = new BlobServiceClient(blobServiceUri, credential);
            }
            else {
                throw new Error('Azure credentials must be provided (connectionString, sasToken, or accountKey)');
            }
            this.containerClient = this.blobServiceClient.getContainerClient(config.containerName);
            azureConnections.inc({ tenant_id: tenantId });
            this.emit('connected', { tenantId, container: config.containerName });
        }
        catch (error) {
            this.emit('error', { tenantId, error });
            throw error;
        }
    }
    async uploadBlob(blobName, data, options = {}) {
        return tracer.startActiveSpan('azure.upload_blob', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_name: blobName,
                overwrite: options.overwrite !== false,
            });
            const startTime = Date.now();
            try {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                let uploadResponse;
                const uploadOptions = {
                    blobHTTPHeaders: {
                        blobContentType: options.contentType || 'application/octet-stream',
                    },
                    metadata: options.metadata,
                    tags: options.tags,
                    tier: options.tier || this.config.defaultTier,
                    conditions: options.conditions,
                };
                if (Buffer.isBuffer(data)) {
                    uploadResponse = await blockBlobClient.upload(data, data.length, uploadOptions);
                }
                else if (data instanceof stream_1.Readable) {
                    uploadResponse = await blockBlobClient.uploadStream(data, options.blockSize || 4 * 1024 * 1024, // 4MB blocks
                    options.maxConcurrency || 5, uploadOptions);
                }
                else if (typeof data === 'string') {
                    const buffer = Buffer.from(data);
                    uploadResponse = await blockBlobClient.upload(buffer, buffer.length, uploadOptions);
                }
                else {
                    throw new Error('Unsupported data type for upload');
                }
                // Get blob properties to return metadata
                const propertiesResponse = await blockBlobClient.getProperties();
                const metadata = this.mapAzureMetadata(blobName, propertiesResponse);
                azureBlobSize.observe({ operation: 'upload', container: this.config.containerName }, metadata.size);
                azureLatency.observe({ operation: 'upload', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'upload',
                    container: this.config.containerName,
                    result: 'success',
                });
                span.setAttributes?.({
                    blob_size: metadata.size,
                    content_type: metadata.contentType,
                    access_tier: metadata.accessTier || 'unknown',
                    etag: metadata.etag,
                });
                this.emit('blobUploaded', {
                    tenantId: this.tenantId,
                    blobName,
                    metadata,
                });
                return metadata;
            }
            catch (error) {
                span.recordException?.(error);
                span.setStatus?.({ message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'upload',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end?.();
            }
        });
    }
    async downloadBlob(blobName, options = {}) {
        return tracer.startActiveSpan('azure.download_blob', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_name: blobName,
                range_request: !!options.range,
            });
            const startTime = Date.now();
            try {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                const downloadOptions = {
                    conditions: options.conditions,
                    maxRetryRequests: options.maxRetryRequests || 3,
                };
                if (options.range) {
                    downloadOptions.range = {
                        offset: options.range.offset,
                        count: options.range.count,
                    };
                }
                const downloadResponse = await blockBlobClient.download(options.range?.offset || 0, options.range?.count, downloadOptions);
                if (!downloadResponse.readableStreamBody) {
                    throw new Error('No data received from blob download');
                }
                // Convert stream to buffer
                const chunks = [];
                const readable = downloadResponse.readableStreamBody;
                for await (const chunk of readable) {
                    chunks.push(chunk);
                }
                const data = Buffer.concat(chunks);
                azureBlobSize.observe({ operation: 'download', container: this.config.containerName }, data.length);
                azureLatency.observe({ operation: 'download', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'download',
                    container: this.config.containerName,
                    result: 'success',
                });
                span.setAttributes?.({
                    blob_size: data.length,
                    content_type: downloadResponse.contentType || 'unknown',
                });
                this.emit('blobDownloaded', {
                    tenantId: this.tenantId,
                    blobName,
                    size: data.length,
                });
                return data;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'download',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async deleteBlob(blobName, options = {}) {
        return tracer.startActiveSpan('azure.delete_blob', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_name: blobName,
                delete_snapshots: options.deleteSnapshots || 'none',
            });
            const startTime = Date.now();
            try {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.delete({
                    deleteSnapshots: options.deleteSnapshots,
                });
                azureLatency.observe({ operation: 'delete', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'delete',
                    container: this.config.containerName,
                    result: 'success',
                });
                this.emit('blobDeleted', { tenantId: this.tenantId, blobName });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'delete',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async getBlobMetadata(blobName) {
        return tracer.startActiveSpan('azure.get_metadata', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_name: blobName,
            });
            const startTime = Date.now();
            try {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                const propertiesResponse = await blockBlobClient.getProperties();
                azureLatency.observe({ operation: 'metadata', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'metadata',
                    container: this.config.containerName,
                    result: 'success',
                });
                return this.mapAzureMetadata(blobName, propertiesResponse);
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'metadata',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async listBlobs(options = {}) {
        return tracer.startActiveSpan('azure.list_blobs', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                prefix: options.prefix || '',
                max_results: options.maxResults || 1000,
            });
            const startTime = Date.now();
            try {
                const listOptions = {
                    prefix: options.prefix,
                    includeMetadata: options.includeMetadata,
                    includeSnapshots: options.includeVersions,
                    includeTags: options.includeTags,
                };
                const blobs = [];
                const iterator = this.containerClient
                    .listBlobsFlat(listOptions)
                    .byPage({
                    maxPageSize: options.maxResults || 1000,
                    continuationToken: options.continuationToken,
                });
                const page = await iterator.next();
                if (!page.done && page.value) {
                    for (const blob of page.value.segment.blobItems) {
                        blobs.push(this.mapBlobItemToMetadata(blob));
                    }
                }
                azureLatency.observe({ operation: 'list', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'list',
                    container: this.config.containerName,
                    result: 'success',
                });
                span.setAttributes?.({
                    blobs_count: blobs.length,
                    has_continuation: !!page.value?.continuationToken,
                });
                return {
                    blobs,
                    continuationToken: page.value?.continuationToken,
                };
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'list',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async copyBlob(sourceBlob, destinationBlob, sourceUrl) {
        return tracer.startActiveSpan('azure.copy_blob', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                source_blob: sourceBlob,
                destination_blob: destinationBlob,
                cross_account: !!sourceUrl,
            });
            const startTime = Date.now();
            try {
                const destinationBlobClient = this.containerClient.getBlockBlobClient(destinationBlob);
                let copySource;
                if (sourceUrl) {
                    copySource = sourceUrl;
                }
                else {
                    const sourceBlobClient = this.containerClient.getBlockBlobClient(sourceBlob);
                    copySource = sourceBlobClient.url;
                }
                const copyPoller = await destinationBlobClient.beginCopyFromURL(copySource);
                await copyPoller.pollUntilDone();
                azureLatency.observe({ operation: 'copy', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'copy',
                    container: this.config.containerName,
                    result: 'success',
                });
                this.emit('blobCopied', {
                    tenantId: this.tenantId,
                    sourceBlob,
                    destinationBlob,
                });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'copy',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async generateSasUrl(blobName, permissions = 'r', expiresIn = 3600) {
        return tracer.startActiveSpan('azure.generate_sas_url', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_name: blobName,
                permissions: permissions,
                expires_in: expiresIn,
            });
            try {
                if (!this.config.accountKey) {
                    throw new Error('Account key required for SAS URL generation');
                }
                const sasPermissions = BlobSASPermissions.parse(permissions);
                const expiryTime = new Date();
                expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);
                const credential = new StorageSharedKeyCredential(this.config.accountName, this.config.accountKey);
                const sasToken = generateBlobSASQueryParameters({
                    containerName: this.config.containerName,
                    blobName,
                    permissions: sasPermissions,
                    expiresOn: expiryTime,
                }, credential).toString();
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                const sasUrl = `${blockBlobClient.url}?${sasToken}`;
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'sas_url',
                    container: this.config.containerName,
                    result: 'success',
                });
                return sasUrl;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'sas_url',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async setAccessTier(blobName, tier) {
        return tracer.startActiveSpan('azure.set_access_tier', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_name: blobName,
                tier: tier,
            });
            const startTime = Date.now();
            try {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.setAccessTier(tier);
                azureLatency.observe({ operation: 'set_tier', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'set_tier',
                    container: this.config.containerName,
                    result: 'success',
                });
                this.emit('tierChanged', { tenantId: this.tenantId, blobName, tier });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'set_tier',
                    container: this.config.containerName,
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    mapAzureMetadata(blobName, properties) {
        return {
            name: blobName,
            container: this.config.containerName,
            size: properties.contentLength || 0,
            contentType: properties.contentType || 'application/octet-stream',
            contentMD5: properties.contentMD5,
            etag: properties.etag,
            lastModified: properties.lastModified,
            accessTier: properties.accessTier,
            metadata: properties.metadata,
            tags: properties.tagCount > 0 ? properties.tags : undefined,
            versionId: properties.versionId,
            isCurrentVersion: properties.isCurrentVersion,
        };
    }
    mapBlobItemToMetadata(blobItem) {
        return {
            name: blobItem.name,
            container: this.config.containerName,
            size: blobItem.properties.contentLength || 0,
            contentType: blobItem.properties.contentType || 'application/octet-stream',
            contentMD5: blobItem.properties.contentMD5,
            etag: blobItem.properties.etag,
            lastModified: blobItem.properties.lastModified,
            accessTier: blobItem.properties.accessTier,
            metadata: blobItem.metadata,
            tags: blobItem.tags,
            versionId: blobItem.versionId,
            isCurrentVersion: blobItem.isCurrentVersion,
        };
    }
    async disconnect() {
        azureConnections.dec({ tenant_id: this.tenantId });
        this.emit('disconnected', { tenantId: this.tenantId });
    }
    // Health check method
    async healthCheck() {
        const startTime = Date.now();
        try {
            await this.containerClient.exists();
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
    async batchDelete(blobNames) {
        return tracer.startActiveSpan('azure.batch_delete', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                container: this.config.containerName,
                blob_count: blobNames.length,
            });
            const startTime = Date.now();
            try {
                const deletePromises = blobNames.map((blobName) => this.containerClient.getBlockBlobClient(blobName).delete());
                await Promise.all(deletePromises);
                azureLatency.observe({ operation: 'batch_delete', container: this.config.containerName }, Date.now() - startTime);
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'batch_delete',
                    container: this.config.containerName,
                    result: 'success',
                });
                this.emit('batchDeleted', {
                    tenantId: this.tenantId,
                    blobNames,
                    count: blobNames.length,
                });
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                azureOperations.inc({
                    tenant_id: this.tenantId,
                    operation: 'batch_delete',
                    container: this.config.containerName,
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
    getContainerName() {
        return this.config.containerName;
    }
    getAccountName() {
        return this.config.accountName;
    }
}
exports.AzureConnector = AzureConnector;
