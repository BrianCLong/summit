"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdnUploadService = void 0;
// @ts-nocheck
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'CdnUploadService' });
class CdnUploadService {
    config;
    client;
    constructor(config) {
        this.config = config;
        if (!config.bucket) {
            throw new Error('CDN bucket must be provided');
        }
        this.client = new client_s3_1.S3Client({
            region: config.region || 'us-east-1',
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
            credentials: config.accessKeyId
                ? {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey || '',
                }
                : undefined,
        });
    }
    async uploadFiles(requests) {
        if (!this.config.enabled)
            return {};
        const uploads = requests.map(async (request) => {
            const key = this.buildKey(request.key || path_1.default.basename(request.localPath));
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
                Body: (0, fs_1.createReadStream)(request.localPath),
                ContentType: request.contentType,
            });
            await this.client.send(command);
            logger.info({
                key,
                bucket: this.config.bucket,
                contentType: request.contentType,
            }, 'Uploaded asset to CDN');
            return { key, url: this.buildPublicUrl(key) };
        });
        const results = await Promise.all(uploads);
        return results.reduce((acc, result) => {
            acc[result.key] = result.url;
            return acc;
        }, {});
    }
    buildKey(key) {
        const normalizedKey = key.replace(/^\/+/, '');
        if (!this.config.basePath) {
            return normalizedKey;
        }
        return path_1.default.posix.join(this.config.basePath, normalizedKey);
    }
    buildPublicUrl(key) {
        if (this.config.publicUrl) {
            return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
        }
        const regionSegment = this.config.region ? `.${this.config.region}` : '';
        return `https://${this.config.bucket}.s3${regionSegment}.amazonaws.com/${key}`;
    }
}
exports.CdnUploadService = CdnUploadService;
