/**
 * S3-Compatible Artifact Store Implementation
 * Manages workflow artifacts with content-addressable storage
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createHash } from 'crypto';
import { ArtifactStore } from '../engine';

export interface S3ArtifactStoreConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  pathPrefix?: string;
}

export class S3ArtifactStore implements ArtifactStore {
  private s3: S3Client;
  private bucket: string;
  private pathPrefix: string;

  constructor(config: S3ArtifactStoreConfig) {
    this.bucket = config.bucket;
    this.pathPrefix = config.pathPrefix || 'maestro-artifacts';

    this.s3 = new S3Client({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  async store(
    runId: string,
    stepId: string,
    name: string,
    data: Buffer,
  ): Promise<string> {
    // Create content-addressable key
    const checksum = createHash('sha256').update(data).digest('hex');
    const key = `${this.pathPrefix}/${runId}/${stepId}/${name}`;
    const contentAddressableKey = `${this.pathPrefix}/content/${checksum.substring(0, 2)}/${checksum}`;

    try {
      // Check if content already exists (deduplication)
      try {
        await this.s3.send(
          new HeadObjectCommand({
            Bucket: this.bucket,
            Key: contentAddressableKey,
          }),
        );

        // Content exists, just create a reference
        await this.createReference(
          key,
          contentAddressableKey,
          data.length,
          checksum,
        );
        return key;
      } catch (error) {
        // Content doesn't exist, store it
      }

      // Store content with metadata
      const upload = new Upload({
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
      await this.createReference(
        key,
        contentAddressableKey,
        data.length,
        checksum,
      );

      return key;
    } catch (error) {
      throw new Error(`Failed to store artifact: ${(error as Error).message}`);
    }
  }

  async retrieve(runId: string, stepId: string, name: string): Promise<Buffer> {
    const key = `${this.pathPrefix}/${runId}/${stepId}/${name}`;

    try {
      // Try direct retrieval first
      let objectKey = key;

      try {
        const response = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        );

        // Check if this is a reference file
        const metadata = response.Metadata;
        if (metadata?.['maestro-content-key']) {
          objectKey = metadata['maestro-content-key'];
        }
      } catch (error) {
        // Key not found, might be content-addressable only
      }

      // Retrieve the actual content
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(
        `Failed to retrieve artifact: ${(error as Error).message}`,
      );
    }
  }

  async list(runId: string): Promise<string[]> {
    const prefix = `${this.pathPrefix}/${runId}/`;

    try {
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );

      return (response.Contents || [])
        .map((obj) => obj.Key!)
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.substring(prefix.length));
    } catch (error) {
      throw new Error(`Failed to list artifacts: ${(error as Error).message}`);
    }
  }

  async getArtifactInfo(
    runId: string,
    stepId: string,
    name: string,
  ): Promise<{
    size: number;
    checksum: string;
    contentType: string;
    lastModified: Date;
  } | null> {
    const key = `${this.pathPrefix}/${runId}/${stepId}/${name}`;

    try {
      const response = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        size: response.ContentLength || 0,
        checksum: response.Metadata?.['maestro-checksum-sha256'] || '',
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      return null;
    }
  }

  async deleteArtifacts(runId: string): Promise<void> {
    const artifacts = await this.list(runId);

    if (artifacts.length === 0) return;

    // Note: This implementation doesn't handle content-addressable cleanup
    // In production, you'd need a garbage collection process
    const deletePromises = artifacts.map((artifact) => {
      const key = `${this.pathPrefix}/${runId}/${artifact}`;
      return this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    });

    await Promise.all(deletePromises);
  }

  private async createReference(
    referenceKey: string,
    contentKey: string,
    size: number,
    checksum: string,
  ): Promise<void> {
    // Create a small reference file pointing to the content-addressable storage
    const referenceData = JSON.stringify({
      contentKey,
      size,
      checksum,
      type: 'maestro-artifact-reference',
    });

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: referenceKey,
        Body: referenceData,
        Metadata: {
          'maestro-content-key': contentKey,
          'maestro-checksum-sha256': checksum,
          'maestro-size': size.toString(),
        },
        ContentType: 'application/json',
      }),
    );
  }

  private detectContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
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
