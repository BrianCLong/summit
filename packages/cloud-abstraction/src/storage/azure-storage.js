"use strict";
/**
 * Azure Blob Storage Provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureStorageProvider = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const types_1 = require("../types");
class AzureStorageProvider {
    provider = types_1.CloudProvider.AZURE;
    client;
    constructor(accountName, accountKey) {
        const name = accountName || process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const key = accountKey || process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const credential = new storage_blob_1.StorageSharedKeyCredential(name, key);
        this.client = new storage_blob_1.BlobServiceClient(`https://${name}.blob.core.windows.net`, credential);
    }
    async upload(bucket, key, data, options) {
        try {
            const containerClient = this.client.getContainerClient(bucket);
            const blockBlobClient = containerClient.getBlockBlobClient(key);
            const buffer = typeof data === 'string' ? Buffer.from(data) : data;
            await blockBlobClient.upload(buffer, buffer.length, {
                blobHTTPHeaders: {
                    blobContentType: options?.contentType
                },
                metadata: options?.metadata,
                tier: options?.storageClass
            });
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to upload blob to Azure Storage: ${key}`, this.provider, error);
        }
    }
    async download(bucket, key, options) {
        try {
            const containerClient = this.client.getContainerClient(bucket);
            const blobClient = containerClient.getBlobClient(key);
            const downloadResponse = await blobClient.download(options?.range?.start, options?.range ? options.range.end - options.range.start + 1 : undefined);
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
                chunks.push(Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to download blob from Azure Storage: ${key}`, this.provider, error);
        }
    }
    async delete(bucket, key) {
        try {
            const containerClient = this.client.getContainerClient(bucket);
            const blobClient = containerClient.getBlobClient(key);
            await blobClient.delete();
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to delete blob from Azure Storage: ${key}`, this.provider, error);
        }
    }
    async list(bucket, options) {
        try {
            const containerClient = this.client.getContainerClient(bucket);
            const objects = [];
            let continuationToken;
            const iterator = containerClient.listBlobsFlat({
                prefix: options?.prefix
            }).byPage({
                maxPageSize: options?.maxResults,
                continuationToken: options?.continuationToken
            });
            const response = await iterator.next();
            if (!response.done) {
                for (const blob of response.value.segment.blobItems) {
                    objects.push({
                        key: blob.name,
                        size: blob.properties.contentLength,
                        lastModified: blob.properties.lastModified,
                        etag: blob.properties.etag,
                        contentType: blob.properties.contentType,
                        metadata: blob.metadata
                    });
                }
                continuationToken = response.value.continuationToken;
            }
            return {
                objects,
                continuationToken,
                isTruncated: Boolean(continuationToken)
            };
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to list blobs in Azure Storage container: ${bucket}`, this.provider, error);
        }
    }
    async getMetadata(bucket, key) {
        try {
            const containerClient = this.client.getContainerClient(bucket);
            const blobClient = containerClient.getBlobClient(key);
            const properties = await blobClient.getProperties();
            return {
                key,
                size: properties.contentLength,
                lastModified: properties.lastModified,
                etag: properties.etag,
                contentType: properties.contentType,
                metadata: properties.metadata
            };
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to get metadata for Azure blob: ${key}`, this.provider, error);
        }
    }
    async exists(bucket, key) {
        try {
            await this.getMetadata(bucket, key);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async copy(sourceBucket, sourceKey, destBucket, destKey) {
        try {
            const sourceClient = this.client
                .getContainerClient(sourceBucket)
                .getBlobClient(sourceKey);
            const destClient = this.client
                .getContainerClient(destBucket)
                .getBlobClient(destKey);
            await destClient.beginCopyFromURL(sourceClient.url);
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to copy Azure blob from ${sourceKey} to ${destKey}`, this.provider, error);
        }
    }
    async getSignedUrl(bucket, key, expiresIn, operation) {
        try {
            const containerClient = this.client.getContainerClient(bucket);
            const blobClient = containerClient.getBlobClient(key);
            const expiresOn = new Date(Date.now() + expiresIn * 1000);
            // Note: Azure SAS tokens require different permissions
            // This is a simplified implementation
            return `${blobClient.url}?se=${expiresOn.toISOString()}`;
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to generate signed URL for Azure blob: ${key}`, this.provider, error);
        }
    }
}
exports.AzureStorageProvider = AzureStorageProvider;
