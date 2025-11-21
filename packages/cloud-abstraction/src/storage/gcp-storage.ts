/**
 * GCP Cloud Storage Provider
 */

import { Storage, Bucket, File } from '@google-cloud/storage';
import { IStorageProvider } from './index';
import {
  CloudProvider,
  StorageObject,
  StorageUploadOptions,
  StorageDownloadOptions,
  StorageListOptions,
  StorageListResult,
  StorageError
} from '../types';

export class GCPStorageProvider implements IStorageProvider {
  readonly provider = CloudProvider.GCP;
  private client: Storage;

  constructor(projectId?: string, keyFilename?: string) {
    this.client = new Storage({
      projectId: projectId || process.env.GCP_PROJECT_ID,
      keyFilename: keyFilename || process.env.GCP_KEY_FILENAME
    });
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | string,
    options?: StorageUploadOptions
  ): Promise<void> {
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
    } catch (error) {
      throw new StorageError(
        `Failed to upload object to GCS: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async download(
    bucket: string,
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Buffer> {
    try {
      const bucketObj = this.client.bucket(bucket);
      const file = bucketObj.file(key);

      const downloadOptions: any = {};
      if (options?.range) {
        downloadOptions.start = options.range.start;
        downloadOptions.end = options.range.end;
      }

      const [buffer] = await file.download(downloadOptions);
      return buffer;
    } catch (error) {
      throw new StorageError(
        `Failed to download object from GCS: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      const bucketObj = this.client.bucket(bucket);
      const file = bucketObj.file(key);

      await file.delete();
    } catch (error) {
      throw new StorageError(
        `Failed to delete object from GCS: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async list(
    bucket: string,
    options?: StorageListOptions
  ): Promise<StorageListResult> {
    try {
      const bucketObj = this.client.bucket(bucket);

      const [files, , response] = await bucketObj.getFiles({
        prefix: options?.prefix,
        maxResults: options?.maxResults,
        pageToken: options?.continuationToken,
        autoPaginate: false
      });

      const objects: StorageObject[] = files.map((file) => ({
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
        isTruncated: !!response?.nextPageToken
      };
    } catch (error) {
      throw new StorageError(
        `Failed to list objects in GCS bucket: ${bucket}`,
        this.provider,
        error as Error
      );
    }
  }

  async getMetadata(bucket: string, key: string): Promise<StorageObject> {
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
    } catch (error) {
      throw new StorageError(
        `Failed to get metadata for GCS object: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const bucketObj = this.client.bucket(bucket);
      const file = bucketObj.file(key);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async copy(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    try {
      const sourceBucketObj = this.client.bucket(sourceBucket);
      const sourceFile = sourceBucketObj.file(sourceKey);

      const destBucketObj = this.client.bucket(destBucket);
      const destFile = destBucketObj.file(destKey);

      await sourceFile.copy(destFile);
    } catch (error) {
      throw new StorageError(
        `Failed to copy GCS object from ${sourceKey} to ${destKey}`,
        this.provider,
        error as Error
      );
    }
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number,
    operation: 'get' | 'put'
  ): Promise<string> {
    try {
      const bucketObj = this.client.bucket(bucket);
      const file = bucketObj.file(key);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: operation === 'get' ? 'read' : 'write',
        expires: Date.now() + expiresIn * 1000
      });

      return url;
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL for GCS object: ${key}`,
        this.provider,
        error as Error
      );
    }
  }
}
