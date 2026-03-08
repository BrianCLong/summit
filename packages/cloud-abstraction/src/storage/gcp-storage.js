"use strict";
// @ts-nocheck
/**
 * GCP Cloud Storage Provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCPStorageProvider = void 0;
const storage_1 = require("@google-cloud/storage");
const types_1 = require("../types");
class GCPStorageProvider {
    provider = types_1.CloudProvider.GCP;
    client;
    constructor(projectId, keyFilename) {
        this.client = new storage_1.Storage({
            projectId: projectId || process.env.GCP_PROJECT_ID,
            keyFilename: keyFilename || process.env.GCP_KEY_FILENAME
        });
    }
    async upload(bucket, key, data, options) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const file = bucketObj.file(key);
            const buffer = typeof data === 'string' ? Buffer.from(data) : data;
            await file.save(buffer, {
                contentType: options?.contentType,
                metadata: {
                    metadata: options?.metadata
                },
                resumable: false
            });
            if (options?.storageClass) {
                await file.setStorageClass(options.storageClass);
            }
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to upload object to GCS: ${key}`, this.provider, error);
        }
    }
    async download(bucket, key, options) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const file = bucketObj.file(key);
            const downloadOptions = {};
            if (options?.range) {
                downloadOptions.start = options.range.start;
                downloadOptions.end = options.range.end;
            }
            const [buffer] = await file.download(downloadOptions);
            return buffer;
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to download object from GCS: ${key}`, this.provider, error);
        }
    }
    async delete(bucket, key) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const file = bucketObj.file(key);
            await file.delete();
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to delete object from GCS: ${key}`, this.provider, error);
        }
    }
    async list(bucket, options) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const [files, , response] = await bucketObj.getFiles({
                prefix: options?.prefix,
                maxResults: options?.maxResults,
                pageToken: options?.continuationToken,
                autoPaginate: false
            });
            const objects = files.map((file) => ({
                key: file.name,
                size: parseInt(file.metadata.size),
                lastModified: new Date(file.metadata.updated),
                etag: file.metadata.etag,
                contentType: file.metadata.contentType,
                metadata: file.metadata.metadata
            }));
            return {
                objects,
                continuationToken: response?.nextPageToken,
                isTruncated: Boolean(response?.nextPageToken)
            };
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to list objects in GCS bucket: ${bucket}`, this.provider, error);
        }
    }
    async getMetadata(bucket, key) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const file = bucketObj.file(key);
            const [metadata] = await file.getMetadata();
            return {
                key,
                size: parseInt(metadata.size),
                lastModified: new Date(metadata.updated),
                etag: metadata.etag,
                contentType: metadata.contentType,
                metadata: metadata.metadata
            };
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to get metadata for GCS object: ${key}`, this.provider, error);
        }
    }
    async exists(bucket, key) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const file = bucketObj.file(key);
            const [exists] = await file.exists();
            return exists;
        }
        catch (error) {
            return false;
        }
    }
    async copy(sourceBucket, sourceKey, destBucket, destKey) {
        try {
            const sourceBucketObj = this.client.bucket(sourceBucket);
            const sourceFile = sourceBucketObj.file(sourceKey);
            const destBucketObj = this.client.bucket(destBucket);
            const destFile = destBucketObj.file(destKey);
            await sourceFile.copy(destFile);
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to copy GCS object from ${sourceKey} to ${destKey}`, this.provider, error);
        }
    }
    async getSignedUrl(bucket, key, expiresIn, operation) {
        try {
            const bucketObj = this.client.bucket(bucket);
            const file = bucketObj.file(key);
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: operation === 'get' ? 'read' : 'write',
                expires: Date.now() + expiresIn * 1000
            });
            return url;
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to generate signed URL for GCS object: ${key}`, this.provider, error);
        }
    }
}
exports.GCPStorageProvider = GCPStorageProvider;
