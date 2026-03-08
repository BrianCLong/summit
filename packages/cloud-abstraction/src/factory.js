"use strict";
/**
 * Factory for creating cloud provider instances
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiCloudStorageProvider = exports.CloudFactory = void 0;
const types_1 = require("./types");
const storage_1 = require("./storage");
class CloudFactory {
    /**
     * Create a storage provider based on cloud configuration
     */
    static createStorage(config) {
        switch (config.provider) {
            case types_1.CloudProvider.AWS:
                return new storage_1.AWSStorageProvider(config.region);
            case types_1.CloudProvider.AZURE:
                return new storage_1.AzureStorageProvider(config.credentials?.accountName, config.credentials?.accountKey);
            case types_1.CloudProvider.GCP:
                return new storage_1.GCPStorageProvider(config.credentials?.projectId, config.credentials?.keyFilename);
            default:
                throw new Error(`Unsupported cloud provider: ${config.provider}`);
        }
    }
    /**
     * Create storage provider from environment
     */
    static createStorageFromEnv() {
        const provider = (process.env.CLOUD_PROVIDER || 'aws');
        const region = process.env.CLOUD_REGION || 'us-east-1';
        return this.createStorage({ provider, region });
    }
    /**
     * Create multi-cloud storage with automatic failover
     */
    static createMultiCloudStorage(configs) {
        const providers = configs.map((config) => this.createStorage(config));
        return new MultiCloudStorageProvider(providers);
    }
}
exports.CloudFactory = CloudFactory;
/**
 * Multi-cloud storage provider with automatic failover
 */
class MultiCloudStorageProvider {
    provider = types_1.CloudProvider.AWS; // Primary provider
    providers;
    primaryIndex = 0;
    constructor(providers) {
        if (providers.length === 0) {
            throw new Error('At least one provider must be specified');
        }
        this.providers = providers;
    }
    /**
     * Execute operation with automatic failover
     */
    async executeWithFailover(operation) {
        const errors = [];
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
            }
            catch (error) {
                errors.push(error);
                console.error(`Provider ${provider.provider} failed:`, error);
            }
        }
        throw new Error(`All providers failed: ${errors.map((e) => e.message).join(', ')}`);
    }
    async upload(bucket, key, data, options) {
        return this.executeWithFailover((provider) => provider.upload(bucket, key, data, options));
    }
    async download(bucket, key, options) {
        return this.executeWithFailover((provider) => provider.download(bucket, key, options));
    }
    async delete(bucket, key) {
        return this.executeWithFailover((provider) => provider.delete(bucket, key));
    }
    async list(bucket, options) {
        return this.executeWithFailover((provider) => provider.list(bucket, options));
    }
    async getMetadata(bucket, key) {
        return this.executeWithFailover((provider) => provider.getMetadata(bucket, key));
    }
    async exists(bucket, key) {
        return this.executeWithFailover((provider) => provider.exists(bucket, key));
    }
    async copy(sourceBucket, sourceKey, destBucket, destKey) {
        return this.executeWithFailover((provider) => provider.copy(sourceBucket, sourceKey, destBucket, destKey));
    }
    async getSignedUrl(bucket, key, expiresIn, operation) {
        return this.executeWithFailover((provider) => provider.getSignedUrl(bucket, key, expiresIn, operation));
    }
    /**
     * Get current primary provider
     */
    getPrimaryProvider() {
        return this.providers[this.primaryIndex];
    }
    /**
     * Set primary provider by index
     */
    setPrimaryProvider(index) {
        if (index < 0 || index >= this.providers.length) {
            throw new Error('Invalid provider index');
        }
        this.primaryIndex = index;
    }
}
exports.MultiCloudStorageProvider = MultiCloudStorageProvider;
