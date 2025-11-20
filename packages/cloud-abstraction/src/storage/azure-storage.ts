/**
 * Azure Blob Storage Provider
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerClient,
  BlobClient
} from '@azure/storage-blob';
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

export class AzureStorageProvider implements IStorageProvider {
  readonly provider = CloudProvider.AZURE;
  private client: BlobServiceClient;

  constructor(accountName?: string, accountKey?: string) {
    const name = accountName || process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const key = accountKey || process.env.AZURE_STORAGE_ACCOUNT_KEY!;

    const credential = new StorageSharedKeyCredential(name, key);
    this.client = new BlobServiceClient(
      `https://${name}.blob.core.windows.net`,
      credential
    );
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | string,
    options?: StorageUploadOptions
  ): Promise<void> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(key);

      const buffer = typeof data === 'string' ? Buffer.from(data) : data;

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: options?.contentType
        },
        metadata: options?.metadata,
        tier: options?.storageClass as any
      });
    } catch (error) {
      throw new StorageError(
        `Failed to upload blob to Azure Storage: ${key}`,
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
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);

      const downloadResponse = await blobClient.download(
        options?.range?.start,
        options?.range ? options.range.end - options.range.start + 1 : undefined
      );

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody!) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new StorageError(
        `Failed to download blob from Azure Storage: ${key}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);

      await blobClient.delete();
    } catch (error) {
      throw new StorageError(
        `Failed to delete blob from Azure Storage: ${key}`,
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
      const containerClient = this.client.getContainerClient(bucket);

      const objects: StorageObject[] = [];
      let continuationToken: string | undefined;

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
            size: blob.properties.contentLength!,
            lastModified: blob.properties.lastModified!,
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
        isTruncated: !!continuationToken
      };
    } catch (error) {
      throw new StorageError(
        `Failed to list blobs in Azure Storage container: ${bucket}`,
        this.provider,
        error as Error
      );
    }
  }

  async getMetadata(bucket: string, key: string): Promise<StorageObject> {
    try {
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);

      const properties = await blobClient.getProperties();

      return {
        key,
        size: properties.contentLength!,
        lastModified: properties.lastModified!,
        etag: properties.etag,
        contentType: properties.contentType,
        metadata: properties.metadata
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get metadata for Azure blob: ${key}`,
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
      const sourceClient = this.client
        .getContainerClient(sourceBucket)
        .getBlobClient(sourceKey);

      const destClient = this.client
        .getContainerClient(destBucket)
        .getBlobClient(destKey);

      await destClient.beginCopyFromURL(sourceClient.url);
    } catch (error) {
      throw new StorageError(
        `Failed to copy Azure blob from ${sourceKey} to ${destKey}`,
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
      const containerClient = this.client.getContainerClient(bucket);
      const blobClient = containerClient.getBlobClient(key);

      const expiresOn = new Date(Date.now() + expiresIn * 1000);

      // Note: Azure SAS tokens require different permissions
      // This is a simplified implementation
      return blobClient.url + `?se=${expiresOn.toISOString()}`;
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL for Azure blob: ${key}`,
        this.provider,
        error as Error
      );
    }
  }
}
