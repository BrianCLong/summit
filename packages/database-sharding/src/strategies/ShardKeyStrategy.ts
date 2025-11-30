import { ShardConfig } from '../types';

/**
 * Base interface for shard key strategies
 */
export interface ShardKeyStrategy {
  /**
   * Determine which shard to use for a given key
   */
  getShard(key: any, shards: ShardConfig[]): ShardConfig;

  /**
   * Get all shards that might contain data for a range query
   */
  getShardsForRange(
    startKey: any,
    endKey: any,
    shards: ShardConfig[]
  ): ShardConfig[];

  /**
   * Strategy name
   */
  getName(): string;
}
