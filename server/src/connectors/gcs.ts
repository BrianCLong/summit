// Maestro Conductor v24.3.0 - Google Cloud Storage Connector
// Epic E15: New Connectors - GCS blob storage integration

// No-op tracer shim to avoid OTEL dependency
// GCS SDK loaded dynamically to avoid type resolution requirement during typecheck

const gcsLib: any = (() => {
  try {
    return require('@google-cloud/storage');
  } catch {
    return {};
  }
})();
const { Storage } = gcsLib as any;
type Storage = any;
type Bucket = any;
type File = any;
import { Counter, Histogram, Gauge } from 'prom-client';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import crypto from 'crypto';

const tracer = {
  startActiveSpan: async (
    _name: string,
    fn: (span: any) => Promise<any> | any,
  ) => {
    const span = {
      setAttributes: (_a?: any) => {},
      recordException: (_e?: any) => {},
      setStatus: (_s?: any) => {},
      end: () => {},
    };
    return await fn(span);
  },
};

// Metrics
const gcsOperations = new Counter({
  name: 'gcs_operations_total',
  help: 'Total GCS operations',
  labelNames: ['tenant_id', 'operation', 'bucket', 'result'],
});

const gcsLatency = new Histogram({
  name: 'gcs_operation_latency_ms',
  help: 'GCS operation latency',
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  labelNames: ['operation', 'bucket'],
});

const gcsObjectSize = new Histogram({
  name: 'gcs_object_size_bytes',
  help: 'Size of GCS objects processed',
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
  labelNames: ['operation', 'bucket'],
});

const gcsConnections = new Gauge({
  name: 'gcs_active_connections',
  help: 'Active GCS connections',
  labelNames: ['tenant_id'],
});

export interface GCSConnectorConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: object;
  bucketName: string;
  region?: string;
  storageClass?: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
  encryptionKey?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface GCSObjectMetadata {
  name: string;
  bucket: string;
  size: number;
  contentType: string;
  md5Hash: string;
  crc32c: string;
  etag: string;
  timeCreated: Date;
  updated: Date;
  storageClass: string;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  destination?: string;
  resumable?: boolean;
  public?: boolean;
  encryptionKey?: string;
  predefinedAcl?:
    | 'private'
    | 'publicRead'
    | 'publicReadWrite'
    | 'bucketOwnerRead'
    | 'bucketOwnerFullControl';
}

export interface DownloadOptions {
  validation?: boolean;
  decompress?: boolean;
  start?: number;
  end?: number;
}

export interface ListOptions {
  prefix?: string;
  delimiter?: string;
  maxResults?: number;
  pageToken?: string;
  versions?: boolean;
}

/**
 * Connector for interacting with Google Cloud Storage (GCS).
 * Supports upload, download, listing, and deletion of objects with observability.
 */
export class GCSConnector extends EventEmitter {
  private storage: Storage;
  private bucket: Bucket;
  private config: GCSConnectorConfig;
  private tenantId: string;

  /**
   * Initializes the GCS connector.
   *
   * @param tenantId - The tenant identifier for multi-tenancy.
   * @param config - Configuration object for GCS connection.
   */
  constructor(tenantId: string, config: GCSConnectorConfig) {
    super();
    this.tenantId = tenantId;
    this.config = config;

    // Initialize Google Cloud Storage client
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
      credentials: config.credentials,
      retryOptions: {
        maxRetries: config.maxRetries || 3,
        retryDelayMultiplier: 2,
        totalTimeout: config.timeout || 60000,
        maxRetryDelay: 10000,
      },
    });

    this.bucket = this.storage.bucket(config.bucketName);

    gcsConnections.inc({ tenant_id: tenantId });
    this.emit('connected', { tenantId, bucket: config.bucketName });
  }

  /**
   * Uploads an object to the GCS bucket.
   *
   * @param objectName - The name of the object (file) to upload.
   * @param data - The data content (Buffer, Readable stream, or string).
   * @param options - Optional upload configuration (metadata, content type, etc.).
   * @returns Promise resolving to the uploaded object's metadata.
   */
  async uploadObject(
    objectName: string,
    data: Buffer | Readable | string,
    options: UploadOptions = {},
  ): Promise<GCSObjectMetadata> {
    return tracer.startActiveSpan('gcs.upload_object', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        object_name: objectName,
        resumable: options.resumable || false,
      });

      const startTime = Date.now();

      try {
        const file = this.bucket.file(options.destination || objectName);
        const stream = file.createWriteStream({
          metadata: {
            contentType: options.contentType || 'application/octet-stream',
            metadata: options.metadata,
          },
          resumable: options.resumable !== false,
          public: options.public || false,
          predefinedAcl: options.predefinedAcl,
          encryptionKey: options.encryptionKey || this.config.encryptionKey,
        });

        return new Promise((resolve, reject) => {
          stream.on('error', (error) => {
            gcsOperations.inc({
              tenant_id: this.tenantId,
              operation: 'upload',
              bucket: this.config.bucketName,
              result: 'error',
            });
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            reject(error);
          });

          stream.on('finish', async () => {
            try {
              const [metadata] = await file.getMetadata();
              const objectMetadata = this.mapGCSMetadata(metadata);

              gcsObjectSize.observe(
                { operation: 'upload', bucket: this.config.bucketName },
                objectMetadata.size,
              );

              gcsLatency.observe(
                { operation: 'upload', bucket: this.config.bucketName },
                Date.now() - startTime,
              );

              gcsOperations.inc({
                tenant_id: this.tenantId,
                operation: 'upload',
                bucket: this.config.bucketName,
                result: 'success',
              });

              span.setAttributes({
                object_size: objectMetadata.size,
                content_type: objectMetadata.contentType,
                storage_class: objectMetadata.storageClass,
              });

              this.emit('objectUploaded', {
                tenantId: this.tenantId,
                objectName,
                metadata: objectMetadata,
              });

              resolve(objectMetadata);
            } catch (error) {
              reject(error);
            }
          });

          // Write data to stream
          if (Buffer.isBuffer(data)) {
            stream.end(data);
          } else if (data instanceof Readable) {
            data.pipe(stream);
          } else if (typeof data === 'string') {
            stream.end(Buffer.from(data));
          } else {
            reject(new Error('Unsupported data type'));
          }
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'upload',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Downloads an object from GCS.
   *
   * @param objectName - The name of the object to download.
   * @param options - Download options (validation, decompression, range).
   * @returns Promise resolving to the file content as a Buffer.
   */
  async downloadObject(
    objectName: string,
    options: DownloadOptions = {},
  ): Promise<Buffer> {
    return tracer.startActiveSpan('gcs.download_object', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        object_name: objectName,
        validation: options.validation !== false,
      });

      const startTime = Date.now();

      try {
        const file = this.bucket.file(objectName);

        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
          throw new Error(`Object ${objectName} not found`);
        }

        const downloadOptions: any = {
          validation: options.validation !== false,
          decompress: options.decompress !== false,
        };

        if (options.start !== undefined || options.end !== undefined) {
          downloadOptions.start = options.start || 0;
          downloadOptions.end = options.end;
        }

        const [data] = await file.download(downloadOptions);

        gcsObjectSize.observe(
          { operation: 'download', bucket: this.config.bucketName },
          data.length,
        );

        gcsLatency.observe(
          { operation: 'download', bucket: this.config.bucketName },
          Date.now() - startTime,
        );

        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'download',
          bucket: this.config.bucketName,
          result: 'success',
        });

        span.setAttributes({
          object_size: data.length,
          range_request:
            options.start !== undefined || options.end !== undefined,
        });

        this.emit('objectDownloaded', {
          tenantId: this.tenantId,
          objectName,
          size: data.length,
        });

        return data;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'download',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Deletes an object from the GCS bucket.
   *
   * @param objectName - The name of the object to delete.
   * @returns Promise resolving when deletion is complete.
   */
  async deleteObject(objectName: string): Promise<void> {
    return tracer.startActiveSpan('gcs.delete_object', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        object_name: objectName,
      });

      const startTime = Date.now();

      try {
        const file = this.bucket.file(objectName);
        await file.delete();

        gcsLatency.observe(
          { operation: 'delete', bucket: this.config.bucketName },
          Date.now() - startTime,
        );

        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'delete',
          bucket: this.config.bucketName,
          result: 'success',
        });

        this.emit('objectDeleted', { tenantId: this.tenantId, objectName });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'delete',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Retrieves metadata for a specific object.
   *
   * @param objectName - The name of the object.
   * @returns Promise resolving to the object's metadata.
   */
  async getObjectMetadata(objectName: string): Promise<GCSObjectMetadata> {
    return tracer.startActiveSpan('gcs.get_metadata', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        object_name: objectName,
      });

      const startTime = Date.now();

      try {
        const file = this.bucket.file(objectName);
        const [metadata] = await file.getMetadata();

        gcsLatency.observe(
          { operation: 'metadata', bucket: this.config.bucketName },
          Date.now() - startTime,
        );

        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'metadata',
          bucket: this.config.bucketName,
          result: 'success',
        });

        return this.mapGCSMetadata(metadata);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'metadata',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Lists objects in the bucket based on filter options.
   *
   * @param options - Filtering options (prefix, delimiter, maxResults, pageToken).
   * @returns Promise resolving to a list of objects and an optional nextPageToken.
   */
  async listObjects(
    options: ListOptions = {},
  ): Promise<{ objects: GCSObjectMetadata[]; nextPageToken?: string }> {
    return tracer.startActiveSpan('gcs.list_objects', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        prefix: options.prefix || '',
        max_results: options.maxResults || 1000,
      });

      const startTime = Date.now();

      try {
        const [files, , metadata] = await this.bucket.getFiles({
          prefix: options.prefix,
          delimiter: options.delimiter,
          maxResults: options.maxResults || 1000,
          pageToken: options.pageToken,
          versions: options.versions || false,
        });

        const objects = files.map((file) => this.mapFileToMetadata(file));

        gcsLatency.observe(
          { operation: 'list', bucket: this.config.bucketName },
          Date.now() - startTime,
        );

        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'list',
          bucket: this.config.bucketName,
          result: 'success',
        });

        span.setAttributes({
          objects_count: objects.length,
          has_next_page: !!metadata.nextPageToken,
        });

        return {
          objects,
          nextPageToken: metadata.nextPageToken,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'list',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Copies an object within the bucket or to another object location.
   *
   * @param sourceObject - Source object name.
   * @param destinationObject - Destination object name.
   * @returns Promise resolving when copy is complete.
   */
  async copyObject(
    sourceObject: string,
    destinationObject: string,
  ): Promise<void> {
    return tracer.startActiveSpan('gcs.copy_object', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        source_object: sourceObject,
        destination_object: destinationObject,
      });

      const startTime = Date.now();

      try {
        const sourceFile = this.bucket.file(sourceObject);
        const destinationFile = this.bucket.file(destinationObject);

        await sourceFile.copy(destinationFile);

        gcsLatency.observe(
          { operation: 'copy', bucket: this.config.bucketName },
          Date.now() - startTime,
        );

        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'copy',
          bucket: this.config.bucketName,
          result: 'success',
        });

        this.emit('objectCopied', {
          tenantId: this.tenantId,
          sourceObject,
          destinationObject,
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'copy',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generates a signed URL for temporary access to an object.
   *
   * @param objectName - The object name.
   * @param action - The action allowed (read, write, delete).
   * @param expiresIn - Expiration time in seconds (default: 3600).
   * @returns The signed URL string.
   */
  async generateSignedUrl(
    objectName: string,
    action: 'read' | 'write' | 'delete',
    expiresIn: number = 3600,
  ): Promise<string> {
    return tracer.startActiveSpan(
      'gcs.generate_signed_url',
      async (span: any) => {
        span.setAttributes({
          tenant_id: this.tenantId,
          bucket: this.config.bucketName,
          object_name: objectName,
          action: action,
          expires_in: expiresIn,
        });

        try {
          const file = this.bucket.file(objectName);
          const expires = new Date();
          expires.setSeconds(expires.getSeconds() + expiresIn);

          const [url] = await file.getSignedUrl({
            action,
            expires,
            version: 'v4',
          });

          gcsOperations.inc({
            tenant_id: this.tenantId,
            operation: 'signed_url',
            bucket: this.config.bucketName,
            result: 'success',
          });

          return url;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          gcsOperations.inc({
            tenant_id: this.tenantId,
            operation: 'signed_url',
            bucket: this.config.bucketName,
            result: 'error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private mapGCSMetadata(metadata: any): GCSObjectMetadata {
    return {
      name: metadata.name,
      bucket: metadata.bucket,
      size: parseInt(metadata.size, 10),
      contentType: metadata.contentType || 'application/octet-stream',
      md5Hash: metadata.md5Hash,
      crc32c: metadata.crc32c,
      etag: metadata.etag,
      timeCreated: new Date(metadata.timeCreated),
      updated: new Date(metadata.updated),
      storageClass: metadata.storageClass,
      metadata: metadata.metadata,
    };
  }

  private mapFileToMetadata(file: File): GCSObjectMetadata {
    const metadata = file.metadata;
    return this.mapGCSMetadata(metadata);
  }

  /**
   * Disconnects the connector and cleans up resources.
   */
  async disconnect(): Promise<void> {
    gcsConnections.dec({ tenant_id: this.tenantId });
    this.emit('disconnected', { tenantId: this.tenantId });
  }

  /**
   * Performs a health check on the GCS connection.
   *
   * @returns Health status object.
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.bucket.exists();
      const latency = Date.now() - startTime;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Deletes multiple objects in a batch operation.
   *
   * @param objectNames - Array of object names to delete.
   * @returns Promise resolving when all deletions are complete.
   */
  async batchDelete(objectNames: string[]): Promise<void> {
    return tracer.startActiveSpan('gcs.batch_delete', async (span: any) => {
      span.setAttributes({
        tenant_id: this.tenantId,
        bucket: this.config.bucketName,
        object_count: objectNames.length,
      });

      const startTime = Date.now();

      try {
        const deletePromises = objectNames.map((objectName) =>
          this.bucket.file(objectName).delete(),
        );

        await Promise.all(deletePromises);

        gcsLatency.observe(
          { operation: 'batch_delete', bucket: this.config.bucketName },
          Date.now() - startTime,
        );

        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'batch_delete',
          bucket: this.config.bucketName,
          result: 'success',
        });

        this.emit('batchDeleted', {
          tenantId: this.tenantId,
          objectNames,
          count: objectNames.length,
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        gcsOperations.inc({
          tenant_id: this.tenantId,
          operation: 'batch_delete',
          bucket: this.config.bucketName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getBucketName(): string {
    return this.config.bucketName;
  }

  getProjectId(): string {
    return this.config.projectId;
  }
}
