/**
 * Factory for creating cloud provider instances
 */

import { CloudProvider, CloudConfig } from './types';
import { IStorageProvider, AWSStorageProvider, AzureStorageProvider, GCPStorageProvider } from './storage';

export class CloudFactory {
  /**
   * Create a storage provider based on cloud configuration
   */
  static createStorage(config: CloudConfig): IStorageProvider {
    switch (config.provider) {
      case CloudProvider.AWS:
        return new AWSStorageProvider(config.region);

      case CloudProvider.AZURE:
        return new AzureStorageProvider(
          config.credentials?.accountName,
          config.credentials?.accountKey
        );

      case CloudProvider.GCP:
        return new GCPStorageProvider(
          config.credentials?.projectId,
          config.credentials?.keyFilename
        );

      default:
        throw new Error(`Unsupported cloud provider: ${config.provider}`);
    }
  }

  /**
   * Create storage provider from environment
   */
  static createStorageFromEnv(): IStorageProvider {
    const provider = (process.env.CLOUD_PROVIDER || 'aws') as CloudProvider;
    const region = process.env.CLOUD_REGION || 'us-east-1';

    return this.createStorage({ provider, region });
  }

  /**
   * Create multi-cloud storage with automatic failover
   */
  static createMultiCloudStorage(
    configs: CloudConfig[]
  ): MultiCloudStorageProvider {
    const providers = configs.map((config) => this.createStorage(config));
    return new MultiCloudStorageProvider(providers);
  }
}

/**
 * Multi-cloud storage provider with automatic failover
 */
export class MultiCloudStorageProvider implements IStorageProvider {
  readonly provider = CloudProvider.AWS; // Primary provider
  private providers: IStorageProvider[];
  private primaryIndex: number = 0;

  constructor(providers: IStorageProvider[]) {
    if (providers.length === 0) {
      throw new Error('At least one provider must be specified');
    }
    this.providers = providers;
  }

  /**
   * Execute operation with automatic failover
   */
  private async executeWithFailover<T>(
    operation: (provider: IStorageProvider) => Promise<T>
  ): Promise<T> {
    const errors: Error[] = [];

    // Try primary provider first
    for (let i = 0; i < this.providers.length; i++) {
      const index = (this.primaryIndex + i) % this.providers.length;
      const provider = this.providers[index];

      try {
        const result = await operation(provider);

        // Update primary if we failed over
        if (i > 0) {
          this.primaryIndex = index;
          console.log(`Failover to provider: ${provider.provider}`);
        }

        return result;
      } catch (error) {
        errors.push(error as Error);
        console.error(`Provider ${provider.provider} failed:`, error);
      }
    }

    throw new Error(
      `All providers failed: ${errors.map((e) => e.message).join(', ')}`
    );
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | string,
    options?: any
  ): Promise<void> {
    return this.executeWithFailover((provider) =>
      provider.upload(bucket, key, data, options)
    );
  }

  async download(bucket: string, key: string, options?: any): Promise<Buffer> {
    return this.executeWithFailover((provider) =>
      provider.download(bucket, key, options)
    );
  }

  async delete(bucket: string, key: string): Promise<void> {
    return this.executeWithFailover((provider) =>
      provider.delete(bucket, key)
    );
  }

  async list(bucket: string, options?: any): Promise<any> {
    return this.executeWithFailover((provider) =>
      provider.list(bucket, options)
    );
  }

  async getMetadata(bucket: string, key: string): Promise<any> {
    return this.executeWithFailover((provider) =>
      provider.getMetadata(bucket, key)
    );
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    return this.executeWithFailover((provider) =>
      provider.exists(bucket, key)
    );
  }

  async copy(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    return this.executeWithFailover((provider) =>
      provider.copy(sourceBucket, sourceKey, destBucket, destKey)
    );
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number,
    operation: 'get' | 'put'
  ): Promise<string> {
    return this.executeWithFailover((provider) =>
      provider.getSignedUrl(bucket, key, expiresIn, operation)
    );
  }

  /**
   * Get current primary provider
   */
  getPrimaryProvider(): IStorageProvider {
    return this.providers[this.primaryIndex];
  }

  /**
   * Set primary provider by index
   */
  setPrimaryProvider(index: number): void {
    if (index < 0 || index >= this.providers.length) {
      throw new Error('Invalid provider index');
    }
    this.primaryIndex = index;
  }
}
