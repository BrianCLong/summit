/**
 * AWS S3 Storage Provider
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export class AWSStorageProvider implements IStorageProvider {
  readonly provider = CloudProvider.AWS;
  private client: S3Client;

  constructor(region?: string) {
    this.client = new S3Client({
      region: region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | string,
    options?: StorageUploadOptions
  ): Promise<void> {
    try {
      const body = typeof data === 'string' ? Buffer.from(data) : data;

      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: options?.contentType,
          Metadata: options?.metadata,
          ServerSideEncryption: options?.encryption ? 'AES256' : undefined,
          StorageClass: options?.storageClass
        })
      );
    } catch (error) {
      throw new StorageError(
        `Failed to upload object to S3: ${key}`,
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
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: options?.range
          ? `bytes=${options.range.start}-${options.range.end}`
          : undefined
      });

      const response = await this.client.send(command);
      const stream = response.Body as any;

      return Buffer.from(await stream.transformToByteArray());
    } catch (error) {
      throw new StorageError(
        `Failed to download object from S3: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key
        })
      );
    } catch (error) {
      throw new StorageError(
        `Failed to delete object from S3: ${key}`,
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
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: options?.prefix,
          MaxKeys: options?.maxResults,
          ContinuationToken: options?.continuationToken
        })
      );

      const objects: StorageObject[] =
        response.Contents?.map((obj) => ({
          key: obj.Key!,
          size: obj.Size!,
          lastModified: obj.LastModified!,
          etag: obj.ETag,
          contentType: undefined,
          metadata: undefined
        })) || [];

      return {
        objects,
        continuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false
      };
    } catch (error) {
      throw new StorageError(
        `Failed to list objects in S3 bucket: ${bucket}`,
        this.provider,
        error as Error
      );
    }
  }

  async getMetadata(bucket: string, key: string): Promise<StorageObject> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key
        })
      );

      return {
        key,
        size: response.ContentLength!,
        lastModified: response.LastModified!,
        etag: response.ETag,
        contentType: response.ContentType,
        metadata: response.Metadata
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get metadata for S3 object: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.getMetadata(bucket, key);
      return true;
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
      await this.client.send(
        new CopyObjectCommand({
          CopySource: `${sourceBucket}/${sourceKey}`,
          Bucket: destBucket,
          Key: destKey
        })
      );
    } catch (error) {
      throw new StorageError(
        `Failed to copy S3 object from ${sourceKey} to ${destKey}`,
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
      const command =
        operation === 'get'
          ? new GetObjectCommand({ Bucket: bucket, Key: key })
          : new PutObjectCommand({ Bucket: bucket, Key: key });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL for S3 object: ${key}`,
        this.provider,
        error as Error
      );
    }
  }
}
