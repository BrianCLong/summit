/**
 * Cloud-agnostic object storage interface
 */

import {
  CloudProvider,
  StorageObject,
  StorageUploadOptions,
  StorageDownloadOptions,
  StorageListOptions,
  StorageListResult,
  StorageError
} from '../types';

export interface IStorageProvider {
  readonly provider: CloudProvider;

  /**
   * Upload an object to storage
   */
  upload(
    bucket: string,
    key: string,
    data: Buffer | string,
    options?: StorageUploadOptions
  ): Promise<void>;

  /**
   * Download an object from storage
   */
  download(
    bucket: string,
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Buffer>;

  /**
   * Delete an object from storage
   */
  delete(bucket: string, key: string): Promise<void>;

  /**
   * List objects in storage
   */
  list(bucket: string, options?: StorageListOptions): Promise<StorageListResult>;

  /**
   * Get object metadata
   */
  getMetadata(bucket: string, key: string): Promise<StorageObject>;

  /**
   * Check if object exists
   */
  exists(bucket: string, key: string): Promise<boolean>;

  /**
   * Copy object within or between buckets
   */
  copy(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void>;

  /**
   * Generate a pre-signed URL for temporary access
   */
  getSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number,
    operation: 'get' | 'put'
  ): Promise<string>;
}

export { AWSStorageProvider } from './aws-storage';
export { AzureStorageProvider } from './azure-storage';
export { GCPStorageProvider } from './gcp-storage';
