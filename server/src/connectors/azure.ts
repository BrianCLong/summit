// Maestro Conductor v24.3.0 - Azure Blob Storage Connector
// Epic E15: New Connectors - Azure blob storage integration

// No-op tracer shim to avoid OTEL dependency
// Azure SDK loaded dynamically to avoid type resolution requirement during typecheck
 
const azureBlob: any = (() => {
  try {
    return require('@azure/storage-blob');
  } catch {
    return {};
  }
})();
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} = azureBlob as any;
type ContainerClient = any;
type BlockBlobClient = any;
type BlobHTTPHeaders = any;
import { Counter, Histogram, Gauge } from 'prom-client';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

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
const azureOperations = new Counter({
  name: 'azure_operations_total',
  help: 'Total Azure Blob operations',
  labelNames: ['tenant_id', 'operation', 'container', 'result'],
});

const azureLatency = new Histogram({
  name: 'azure_operation_latency_ms',
  help: 'Azure Blob operation latency',
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  labelNames: ['operation', 'container'],
});

const azureBlobSize = new Histogram({
  name: 'azure_blob_size_bytes',
  help: 'Size of Azure blobs processed',
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
  labelNames: ['operation', 'container'],
});

const azureConnections = new Gauge({
  name: 'azure_active_connections',
  help: 'Active Azure Blob connections',
  labelNames: ['tenant_id'],
});

export interface AzureConnectorConfig {
  accountName: string;
  accountKey?: string;
  sasToken?: string;
  connectionString?: string;
  containerName: string;
  defaultTier?: 'Hot' | 'Cool' | 'Archive';
  maxRetries?: number;
  timeout?: number;
  endpoint?: string;
}

export interface AzureBlobMetadata {
  name: string;
  container: string;
  size: number;
  contentType: string;
  contentMD5?: string;
  etag: string;
  lastModified: Date;
  accessTier?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  versionId?: string;
  isCurrentVersion?: boolean;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  tier?: 'Hot' | 'Cool' | 'Archive';
  overwrite?: boolean;
  blockSize?: number;
  maxConcurrency?: number;
  conditions?: {
    ifMatch?: string;
    ifNoneMatch?: string;
    ifModifiedSince?: Date;
    ifUnmodifiedSince?: Date;
  };
}

export interface DownloadOptions {
  range?: {
    offset: number;
    count?: number;
  };
  conditions?: {
    ifMatch?: string;
    ifNoneMatch?: string;
    ifModifiedSince?: Date;
    ifUnmodifiedSince?: Date;
  };
  maxRetryRequests?: number;
}

export interface ListOptions {
  prefix?: string;
  maxResults?: number;
  continuationToken?: string;
  includeTags?: boolean;
  includeVersions?: boolean;
  includeMetadata?: boolean;
}

export class AzureConnector extends EventEmitter {
  private blobServiceClient: any;
  private containerClient: ContainerClient;
  private config: AzureConnectorConfig;
  private tenantId: string;

  constructor(tenantId: string, config: AzureConnectorConfig) {
    super();
    this.tenantId = tenantId;
    this.config = config;

    try {
      // Initialize Azure Blob Service Client
      if (config.connectionString) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
          config.connectionString,
        );
      } else if (config.sasToken) {
        const blobServiceUri =
          config.endpoint ||
          `https://${config.accountName}.blob.core.windows.net`;
        this.blobServiceClient = new BlobServiceClient(
          `${blobServiceUri}?${config.sasToken}`,
        );
      } else if (config.accountKey) {
        const credential = new StorageSharedKeyCredential(
          config.accountName,
          config.accountKey,
        );
        const blobServiceUri =
          config.endpoint ||
          `https://${config.accountName}.blob.core.windows.net`;
        this.blobServiceClient = new BlobServiceClient(
          blobServiceUri,
          credential,
        );
      } else {
        throw new Error(
          'Azure credentials must be provided (connectionString, sasToken, or accountKey)',
        );
      }

      this.containerClient = this.blobServiceClient.getContainerClient(
        config.containerName,
      );

      azureConnections.inc({ tenant_id: tenantId });
      this.emit('connected', { tenantId, container: config.containerName });
    } catch (error) {
      this.emit('error', { tenantId, error });
      throw error;
    }
  }

  async uploadBlob(
    blobName: string,
    data: Buffer | Readable | string,
    options: UploadOptions = {},
  ): Promise<AzureBlobMetadata> {
    return tracer.startActiveSpan('azure.upload_blob', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        blob_name: blobName,
        overwrite: options.overwrite !== false,
      });

      const startTime = Date.now();

      try {
        const blockBlobClient =
          this.containerClient.getBlockBlobClient(blobName);

        let uploadResponse;
        const uploadOptions: any = {
          blobHTTPHeaders: {
            blobContentType: options.contentType || 'application/octet-stream',
          } as any,
          metadata: options.metadata,
          tags: options.tags,
          tier: options.tier || this.config.defaultTier,
          conditions: options.conditions,
        };

        if (Buffer.isBuffer(data)) {
          uploadResponse = await blockBlobClient.upload(
            data,
            data.length,
            uploadOptions,
          );
        } else if (data instanceof Readable) {
          uploadResponse = await blockBlobClient.uploadStream(
            data,
            options.blockSize || 4 * 1024 * 1024, // 4MB blocks
            options.maxConcurrency || 5,
            uploadOptions,
          );
        } else if (typeof data === 'string') {
          const buffer = Buffer.from(data);
          uploadResponse = await blockBlobClient.upload(
            buffer,
            buffer.length,
            uploadOptions,
          );
        } else {
          throw new Error('Unsupported data type for upload');
        }

        // Get blob properties to return metadata
        const propertiesResponse = await blockBlobClient.getProperties();
        const metadata = this.mapAzureMetadata(blobName, propertiesResponse);

        azureBlobSize.observe(
          { operation: 'upload', container: this.config.containerName },
          metadata.size,
        );

        azureLatency.observe(
          { operation: 'upload', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'upload',
          container: this.config.containerName,
          result: 'success',
        });

        span.setAttributes?.({
          blob_size: metadata.size,
          content_type: metadata.contentType,
          access_tier: metadata.accessTier || 'unknown',
          etag: metadata.etag,
        });

        this.emit('blobUploaded', {
          tenantId: this.tenantId,
          blobName,
          metadata,
        });

        return metadata;
      } catch (error) {
        span.recordException?.(error as Error);
        span.setStatus?.({ message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'upload',
          container: this.config.containerName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end?.();
      }
    });
  }

  async downloadBlob(
    blobName: string,
    options: DownloadOptions = {},
  ): Promise<Buffer> {
    return tracer.startActiveSpan('azure.download_blob', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        blob_name: blobName,
        range_request: !!options.range,
      });

      const startTime = Date.now();

      try {
        const blockBlobClient =
          this.containerClient.getBlockBlobClient(blobName);

        const downloadOptions: any = {
          conditions: options.conditions,
          maxRetryRequests: options.maxRetryRequests || 3,
        };

        if (options.range) {
          downloadOptions.range = {
            offset: options.range.offset,
            count: options.range.count,
          };
        }

        const downloadResponse = await blockBlobClient.download(
          options.range?.offset || 0,
          options.range?.count,
          downloadOptions,
        );

        if (!downloadResponse.readableStreamBody) {
          throw new Error('No data received from blob download');
        }

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        const readable = downloadResponse.readableStreamBody;

        for await (const chunk of readable) {
          chunks.push(chunk);
        }

        const data = Buffer.concat(chunks);

        azureBlobSize.observe(
          { operation: 'download', container: this.config.containerName },
          data.length,
        );

        azureLatency.observe(
          { operation: 'download', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'download',
          container: this.config.containerName,
          result: 'success',
        });

        span.setAttributes?.({
          blob_size: data.length,
          content_type: downloadResponse.contentType || 'unknown',
        });

        this.emit('blobDownloaded', {
          tenantId: this.tenantId,
          blobName,
          size: data.length,
        });

        return data;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'download',
          container: this.config.containerName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async deleteBlob(
    blobName: string,
    options: { deleteSnapshots?: 'include' | 'only' } = {},
  ): Promise<void> {
    return tracer.startActiveSpan('azure.delete_blob', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        blob_name: blobName,
        delete_snapshots: options.deleteSnapshots || 'none',
      });

      const startTime = Date.now();

      try {
        const blockBlobClient =
          this.containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.delete({
          deleteSnapshots: options.deleteSnapshots,
        });

        azureLatency.observe(
          { operation: 'delete', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'delete',
          container: this.config.containerName,
          result: 'success',
        });

        this.emit('blobDeleted', { tenantId: this.tenantId, blobName });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'delete',
          container: this.config.containerName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getBlobMetadata(blobName: string): Promise<AzureBlobMetadata> {
    return tracer.startActiveSpan('azure.get_metadata', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        blob_name: blobName,
      });

      const startTime = Date.now();

      try {
        const blockBlobClient =
          this.containerClient.getBlockBlobClient(blobName);
        const propertiesResponse = await blockBlobClient.getProperties();

        azureLatency.observe(
          { operation: 'metadata', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'metadata',
          container: this.config.containerName,
          result: 'success',
        });

        return this.mapAzureMetadata(blobName, propertiesResponse);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'metadata',
          container: this.config.containerName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async listBlobs(
    options: ListOptions = {},
  ): Promise<{ blobs: AzureBlobMetadata[]; continuationToken?: string }> {
    return tracer.startActiveSpan('azure.list_blobs', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        prefix: options.prefix || '',
        max_results: options.maxResults || 1000,
      });

      const startTime = Date.now();

      try {
        const listOptions: any = {
          prefix: options.prefix,
          includeMetadata: options.includeMetadata,
          includeSnapshots: options.includeVersions,
          includeTags: options.includeTags,
        };

        const blobs: AzureBlobMetadata[] = [];
        const iterator = this.containerClient
          .listBlobsFlat(listOptions)
          .byPage({
            maxPageSize: options.maxResults || 1000,
            continuationToken: options.continuationToken,
          });

        const page = await iterator.next();
        if (!page.done && page.value) {
          for (const blob of page.value.segment.blobItems) {
            blobs.push(this.mapBlobItemToMetadata(blob));
          }
        }

        azureLatency.observe(
          { operation: 'list', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'list',
          container: this.config.containerName,
          result: 'success',
        });

        span.setAttributes?.({
          blobs_count: blobs.length,
          has_continuation: !!page.value?.continuationToken,
        });

        return {
          blobs,
          continuationToken: page.value?.continuationToken,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'list',
          container: this.config.containerName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async copyBlob(
    sourceBlob: string,
    destinationBlob: string,
    sourceUrl?: string,
  ): Promise<void> {
    return tracer.startActiveSpan('azure.copy_blob', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        source_blob: sourceBlob,
        destination_blob: destinationBlob,
        cross_account: !!sourceUrl,
      });

      const startTime = Date.now();

      try {
        const destinationBlobClient =
          this.containerClient.getBlockBlobClient(destinationBlob);

        let copySource: string;
        if (sourceUrl) {
          copySource = sourceUrl;
        } else {
          const sourceBlobClient =
            this.containerClient.getBlockBlobClient(sourceBlob);
          copySource = sourceBlobClient.url;
        }

        const copyPoller =
          await destinationBlobClient.beginCopyFromURL(copySource);
        await copyPoller.pollUntilDone();

        azureLatency.observe(
          { operation: 'copy', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'copy',
          container: this.config.containerName,
          result: 'success',
        });

        this.emit('blobCopied', {
          tenantId: this.tenantId,
          sourceBlob,
          destinationBlob,
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'copy',
          container: this.config.containerName,
          result: 'error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async generateSasUrl(
    blobName: string,
    permissions: string = 'r',
    expiresIn: number = 3600,
  ): Promise<string> {
    return tracer.startActiveSpan(
      'azure.generate_sas_url',
      async (span: any) => {
        span.setAttributes?.({
          tenant_id: this.tenantId,
          container: this.config.containerName,
          blob_name: blobName,
          permissions: permissions,
          expires_in: expiresIn,
        });

        try {
          if (!this.config.accountKey) {
            throw new Error('Account key required for SAS URL generation');
          }

          const sasPermissions = BlobSASPermissions.parse(permissions);
          const expiryTime = new Date();
          expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);

          const credential = new StorageSharedKeyCredential(
            this.config.accountName,
            this.config.accountKey,
          );

          const sasToken = generateBlobSASQueryParameters(
            {
              containerName: this.config.containerName,
              blobName,
              permissions: sasPermissions,
              expiresOn: expiryTime,
            },
            credential,
          ).toString();

          const blockBlobClient =
            this.containerClient.getBlockBlobClient(blobName);
          const sasUrl = `${blockBlobClient.url}?${sasToken}`;

          azureOperations.inc({
            tenant_id: this.tenantId,
            operation: 'sas_url',
            container: this.config.containerName,
            result: 'success',
          });

          return sasUrl;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          azureOperations.inc({
            tenant_id: this.tenantId,
            operation: 'sas_url',
            container: this.config.containerName,
            result: 'error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async setAccessTier(
    blobName: string,
    tier: 'Hot' | 'Cool' | 'Archive',
  ): Promise<void> {
    return tracer.startActiveSpan(
      'azure.set_access_tier',
      async (span: any) => {
        span.setAttributes?.({
          tenant_id: this.tenantId,
          container: this.config.containerName,
          blob_name: blobName,
          tier: tier,
        });

        const startTime = Date.now();

        try {
          const blockBlobClient =
            this.containerClient.getBlockBlobClient(blobName);
          await blockBlobClient.setAccessTier(tier);

          azureLatency.observe(
            { operation: 'set_tier', container: this.config.containerName },
            Date.now() - startTime,
          );

          azureOperations.inc({
            tenant_id: this.tenantId,
            operation: 'set_tier',
            container: this.config.containerName,
            result: 'success',
          });

          this.emit('tierChanged', { tenantId: this.tenantId, blobName, tier });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          azureOperations.inc({
            tenant_id: this.tenantId,
            operation: 'set_tier',
            container: this.config.containerName,
            result: 'error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private mapAzureMetadata(
    blobName: string,
    properties: any,
  ): AzureBlobMetadata {
    return {
      name: blobName,
      container: this.config.containerName,
      size: properties.contentLength || 0,
      contentType: properties.contentType || 'application/octet-stream',
      contentMD5: properties.contentMD5,
      etag: properties.etag,
      lastModified: properties.lastModified,
      accessTier: properties.accessTier,
      metadata: properties.metadata,
      tags: properties.tagCount > 0 ? properties.tags : undefined,
      versionId: properties.versionId,
      isCurrentVersion: properties.isCurrentVersion,
    };
  }

  private mapBlobItemToMetadata(blobItem: any): AzureBlobMetadata {
    return {
      name: blobItem.name,
      container: this.config.containerName,
      size: blobItem.properties.contentLength || 0,
      contentType:
        blobItem.properties.contentType || 'application/octet-stream',
      contentMD5: blobItem.properties.contentMD5,
      etag: blobItem.properties.etag,
      lastModified: blobItem.properties.lastModified,
      accessTier: blobItem.properties.accessTier,
      metadata: blobItem.metadata,
      tags: blobItem.tags,
      versionId: blobItem.versionId,
      isCurrentVersion: blobItem.isCurrentVersion,
    };
  }

  async disconnect(): Promise<void> {
    azureConnections.dec({ tenant_id: this.tenantId });
    this.emit('disconnected', { tenantId: this.tenantId });
  }

  // Health check method
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.containerClient.exists();
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

  // Batch operations
  async batchDelete(blobNames: string[]): Promise<void> {
    return tracer.startActiveSpan('azure.batch_delete', async (span: any) => {
      span.setAttributes?.({
        tenant_id: this.tenantId,
        container: this.config.containerName,
        blob_count: blobNames.length,
      });

      const startTime = Date.now();

      try {
        const deletePromises = blobNames.map((blobName) =>
          this.containerClient.getBlockBlobClient(blobName).delete(),
        );

        await Promise.all(deletePromises);

        azureLatency.observe(
          { operation: 'batch_delete', container: this.config.containerName },
          Date.now() - startTime,
        );

        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'batch_delete',
          container: this.config.containerName,
          result: 'success',
        });

        this.emit('batchDeleted', {
          tenantId: this.tenantId,
          blobNames,
          count: blobNames.length,
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        azureOperations.inc({
          tenant_id: this.tenantId,
          operation: 'batch_delete',
          container: this.config.containerName,
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

  getContainerName(): string {
    return this.config.containerName;
  }

  getAccountName(): string {
    return this.config.accountName;
  }
}
