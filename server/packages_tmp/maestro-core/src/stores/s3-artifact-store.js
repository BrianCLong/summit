"use strict";
/**
 * S3-Compatible Artifact Store Implementation
 * Manages workflow artifacts with content-addressable storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3ArtifactStore = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const crypto_1 = require("crypto");
class S3ArtifactStore {
    s3;
    bucket;
    pathPrefix;
    constructor(config) {
        this.bucket = config.bucket;
        this.pathPrefix = config.pathPrefix || 'maestro-artifacts';
        this.s3 = new client_s3_1.S3Client({
            region: config.region || 'us-east-1',
            endpoint: config.endpoint,
            credentials: config.accessKeyId && config.secretAccessKey
                ? {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                }
                : undefined,
        });
    }
    async store(runId, stepId, name, data) {
        // Create content-addressable key
        const checksum = (0, crypto_1.createHash)('sha256').update(data).digest('hex');
        const key = `${this.pathPrefix}/${runId}/${stepId}/${name}`;
        const contentAddressableKey = `${this.pathPrefix}/content/${checksum.substring(0, 2)}/${checksum}`;
        try {
            // Check if content already exists (deduplication)
            try {
                await this.s3.send(new client_s3_1.HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: contentAddressableKey,
                }));
                // Content exists, just create a reference
                await this.createReference(key, contentAddressableKey, data.length, checksum);
                return key;
            }
            catch (error) {
                // Content doesn't exist, store it
            }
            // Store content with metadata
            const upload = new lib_storage_1.Upload({
                client: this.s3,
                params: {
                    Bucket: this.bucket,
                    Key: contentAddressableKey,
                    Body: data,
                    Metadata: {
                        'maestro-checksum-sha256': checksum,
                        'maestro-run-id': runId,
                        'maestro-step-id': stepId,
                        'maestro-original-name': name,
                        'maestro-size': data.length.toString(),
                    },
                    ContentType: this.detectContentType(name),
                    ServerSideEncryption: 'AES256',
                },
            });
            await upload.done();
            // Create reference link
            await this.createReference(key, contentAddressableKey, data.length, checksum);
            return key;
        }
        catch (error) {
            throw new Error(`Failed to store artifact: ${error.message}`);
        }
    }
    async retrieve(runId, stepId, name) {
        const key = `${this.pathPrefix}/${runId}/${stepId}/${name}`;
        try {
            // Try direct retrieval first
            let objectKey = key;
            try {
                const response = await this.s3.send(new client_s3_1.GetObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }));
                // Check if this is a reference file
                const metadata = response.Metadata;
                if (metadata?.['maestro-content-key']) {
                    objectKey = metadata['maestro-content-key'];
                }
            }
            catch (error) {
                // Key not found, might be content-addressable only
            }
            // Retrieve the actual content
            const response = await this.s3.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: objectKey,
            }));
            if (!response.Body) {
                throw new Error('Empty response body');
            }
            // Convert stream to buffer
            const chunks = [];
            const reader = response.Body.transformToWebStream().getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                chunks.push(value);
            }
            return Buffer.concat(chunks);
        }
        catch (error) {
            throw new Error(`Failed to retrieve artifact: ${error.message}`);
        }
    }
    async list(runId) {
        const prefix = `${this.pathPrefix}/${runId}/`;
        try {
            const response = await this.s3.send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
            }));
            return (response.Contents || [])
                .map((obj) => obj.Key)
                .filter((key) => key.startsWith(prefix))
                .map((key) => key.substring(prefix.length));
        }
        catch (error) {
            throw new Error(`Failed to list artifacts: ${error.message}`);
        }
    }
    async getArtifactInfo(runId, stepId, name) {
        const key = `${this.pathPrefix}/${runId}/${stepId}/${name}`;
        try {
            const response = await this.s3.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            return {
                size: response.ContentLength || 0,
                checksum: response.Metadata?.['maestro-checksum-sha256'] || '',
                contentType: response.ContentType || 'application/octet-stream',
                lastModified: response.LastModified || new Date(),
            };
        }
        catch (error) {
            return null;
        }
    }
    async deleteArtifacts(runId) {
        const artifacts = await this.list(runId);
        if (artifacts.length === 0)
            return;
        // Note: This implementation doesn't handle content-addressable cleanup
        // In production, you'd need a garbage collection process
        const deletePromises = artifacts.map((artifact) => {
            const key = `${this.pathPrefix}/${runId}/${artifact}`;
            return this.s3.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
        });
        await Promise.all(deletePromises);
    }
    async createReference(referenceKey, contentKey, size, checksum) {
        // Create a small reference file pointing to the content-addressable storage
        const referenceData = JSON.stringify({
            contentKey,
            size,
            checksum,
            type: 'maestro-artifact-reference',
        });
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: referenceKey,
            Body: referenceData,
            Metadata: {
                'maestro-content-key': contentKey,
                'maestro-checksum-sha256': checksum,
                'maestro-size': size.toString(),
            },
            ContentType: 'application/json',
        }));
    }
    detectContentType(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        const contentTypes = {
            json: 'application/json',
            xml: 'application/xml',
            html: 'text/html',
            txt: 'text/plain',
            csv: 'text/csv',
            pdf: 'application/pdf',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            zip: 'application/zip',
            tar: 'application/x-tar',
            gz: 'application/gzip',
        };
        return contentTypes[ext || ''] || 'application/octet-stream';
    }
}
exports.S3ArtifactStore = S3ArtifactStore;
