import { createReadStream } from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pino from 'pino';

const logger = pino({ name: 'CdnUploadService' });

export interface CdnUploadConfig {
  enabled: boolean;
  bucket: string;
  region?: string;
  basePath?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  publicUrl?: string;
}

export interface CdnUploadRequest {
  localPath: string;
  key?: string;
  contentType?: string;
}

export class CdnUploadService {
  private client: S3Client;

  constructor(private readonly config: CdnUploadConfig) {
    if (!config.bucket) {
      throw new Error('CDN bucket must be provided');
    }

    this.client = new S3Client({
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

  async uploadFiles(
    requests: CdnUploadRequest[],
  ): Promise<Record<string, string>> {
    if (!this.config.enabled) return {};

    const uploads = requests.map(async (request) => {
      const key = this.buildKey(request.key || path.basename(request.localPath));
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: createReadStream(request.localPath),
        ContentType: request.contentType,
      });

      await this.client.send(command);
      logger.info(
        {
          key,
          bucket: this.config.bucket,
          contentType: request.contentType,
        },
        'Uploaded asset to CDN',
      );
      return { key, url: this.buildPublicUrl(key) };
    });

    const results = await Promise.all(uploads);
    return results.reduce<Record<string, string>>((acc, result) => {
      acc[result.key] = result.url;
      return acc;
    }, {});
  }

  private buildKey(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '');
    if (!this.config.basePath) {
      return normalizedKey;
    }

    return path.posix.join(this.config.basePath, normalizedKey);
  }

  private buildPublicUrl(key: string): string {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
    }

    const regionSegment = this.config.region ? `.${this.config.region}` : '';
    return `https://${this.config.bucket}.s3${regionSegment}.amazonaws.com/${key}`;
  }
}
