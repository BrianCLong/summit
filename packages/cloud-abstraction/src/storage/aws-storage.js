"use strict";
// @ts-nocheck
/**
 * AWS S3 Storage Provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSStorageProvider = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const types_1 = require("../types");
class AWSStorageProvider {
    provider = types_1.CloudProvider.AWS;
    client;
    constructor(region) {
        this.client = new client_s3_1.S3Client({
            region: region || process.env.AWS_REGION || 'us-east-1'
        });
    }
    async upload(bucket, key, data, options) {
        try {
            const body = typeof data === 'string' ? Buffer.from(data) : data;
            await this.client.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: options?.contentType,
                Metadata: options?.metadata,
                ServerSideEncryption: options?.encryption ? 'AES256' : undefined,
                StorageClass: options?.storageClass
            }));
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to upload object to S3: ${key}`, this.provider, error);
        }
    }
    async download(bucket, key, options) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: bucket,
                Key: key,
                Range: options?.range
                    ? `bytes=${options.range.start}-${options.range.end}`
                    : undefined
            });
            const response = await this.client.send(command);
            const stream = response.Body;
            return Buffer.from(await stream.transformToByteArray());
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to download object from S3: ${key}`, this.provider, error);
        }
    }
    async delete(bucket, key) {
        try {
            await this.client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: bucket,
                Key: key
            }));
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to delete object from S3: ${key}`, this.provider, error);
        }
    }
    async list(bucket, options) {
        try {
            const response = await this.client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                Prefix: options?.prefix,
                MaxKeys: options?.maxResults,
                ContinuationToken: options?.continuationToken
            }));
            const objects = response.Contents?.map((obj) => ({
                key: obj.Key,
                size: obj.Size,
                lastModified: obj.LastModified,
                etag: obj.ETag,
                contentType: undefined,
                metadata: undefined
            })) || [];
            return {
                objects,
                continuationToken: response.NextContinuationToken,
                isTruncated: response.IsTruncated || false
            };
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to list objects in S3 bucket: ${bucket}`, this.provider, error);
        }
    }
    async getMetadata(bucket, key) {
        try {
            const response = await this.client.send(new client_s3_1.HeadObjectCommand({
                Bucket: bucket,
                Key: key
            }));
            return {
                key,
                size: response.ContentLength,
                lastModified: response.LastModified,
                etag: response.ETag,
                contentType: response.ContentType,
                metadata: response.Metadata
            };
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to get metadata for S3 object: ${key}`, this.provider, error);
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
            await this.client.send(new client_s3_1.CopyObjectCommand({
                CopySource: `${sourceBucket}/${sourceKey}`,
                Bucket: destBucket,
                Key: destKey
            }));
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to copy S3 object from ${sourceKey} to ${destKey}`, this.provider, error);
        }
    }
    async getSignedUrl(bucket, key, expiresIn, operation) {
        try {
            const command = operation === 'get'
                ? new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key })
                : new client_s3_1.PutObjectCommand({ Bucket: bucket, Key: key });
            return await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
        }
        catch (error) {
            throw new types_1.StorageError(`Failed to generate signed URL for S3 object: ${key}`, this.provider, error);
        }
    }
}
exports.AWSStorageProvider = AWSStorageProvider;
