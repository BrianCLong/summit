import { createHash } from 'crypto';
import config from '../../config/index.js';
import { PartitionStrategy, type PartitioningServiceConfig } from './types.js';

export class PartitioningService {
  private config: PartitioningServiceConfig;
  private static instance: PartitioningService;

  private constructor(config: PartitioningServiceConfig) {
    this.config = config;
  }

  public static getInstance(): PartitioningService {
    if (!PartitioningService.instance) {
      // Default config based on application settings
      const defaultConfig: PartitioningServiceConfig = {
        enabled: config.partitioning?.enabled || false,
        strategy: (config.partitioning?.strategy as PartitionStrategy) || PartitionStrategy.HASH,
        shardCount: config.partitioning?.shardCount || 1,
        partitionKey: 'id',
        redisPrefix: 'shard',
      };
      PartitioningService.instance = new PartitioningService(defaultConfig);
    }
    return PartitioningService.instance;
  }

  /**
   * Get the partition key for a given entity ID.
   * This key can be used as a prefix for Redis keys or routing logic.
   *
   * @param id The entity identifier (e.g., UUID)
   * @param strategy Optional strategy override
   * @returns The partition key (e.g., 'shard:0', 'shard:1')
   */
  public getPartitionKey(id: string, strategy?: PartitionStrategy): string {
    if (!this.config.enabled) {
      return '';
    }

    const currentStrategy = strategy || this.config.strategy;
    let shardIndex = 0;

    switch (currentStrategy) {
      case PartitionStrategy.HASH:
        shardIndex = this.getHashShard(id);
        break;
      case PartitionStrategy.RANGE:
        // Range strategy implementation would go here (e.g., based on timestamps or numeric IDs)
        // For UUIDs, hash is preferred. Fallback to hash for now.
        shardIndex = this.getHashShard(id);
        break;
      case PartitionStrategy.LIST:
        // List strategy implementation
        shardIndex = 0; // Placeholder
        break;
      default:
        shardIndex = 0;
    }

    return `${this.config.redisPrefix}:${shardIndex}`;
  }

  /**
   * Calculate shard index using consistent hashing (simple modulus for now).
   */
  private getHashShard(key: string): number {
    const hash = createHash('md5').update(key).digest('hex');
    const numericHash = parseInt(hash.substring(0, 8), 16);
    return numericHash % this.config.shardCount;
  }

  /**
   * Generate a fully qualified Redis key with partition prefix.
   */
  public getNamespacedKey(key: string, partitionId?: string): string {
    if (!this.config.enabled) {
      return key;
    }
    // If partitionId is not provided, try to derive it from the key itself if possible,
    // but usually the caller should provide the ID to partition by.
    // If the key is 'case:123', we can extract '123'.
    // Here we assume the caller handles the logic or passes the raw ID.

    // If key is just 'case:123', we need the ID '123' to determine the shard.
    // This method is a helper assuming 'key' is the suffix.

    const prefix = partitionId ? this.getPartitionKey(partitionId) : '';
    return prefix ? `${prefix}:${key}` : key;
  }
}
