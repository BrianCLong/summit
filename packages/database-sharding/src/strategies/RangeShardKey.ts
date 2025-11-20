import { ShardKeyStrategy } from './ShardKeyStrategy';
import { ShardConfig } from '../types';

/**
 * Range-based sharding for ordered data (e.g., time-series, IDs)
 */
export class RangeShardKey implements ShardKeyStrategy {
  getName(): string {
    return 'range';
  }

  getShard(key: any, shards: ShardConfig[]): ShardConfig {
    // Find the shard whose range contains the key
    for (const shard of shards) {
      if (
        shard.rangeStart !== undefined &&
        shard.rangeEnd !== undefined &&
        this.isInRange(key, shard.rangeStart, shard.rangeEnd)
      ) {
        return shard;
      }
    }

    // If no range matches, use default shard or throw error
    const defaultShard = shards.find((s) => s.name === 'default');
    if (defaultShard) {
      return defaultShard;
    }

    throw new Error(`No shard found for key ${key}`);
  }

  getShardsForRange(
    startKey: any,
    endKey: any,
    shards: ShardConfig[]
  ): ShardConfig[] {
    // Find all shards whose ranges overlap with [startKey, endKey]
    const matchingShards: ShardConfig[] = [];

    for (const shard of shards) {
      if (shard.rangeStart === undefined || shard.rangeEnd === undefined) {
        continue;
      }

      // Check if ranges overlap
      if (this.rangesOverlap(startKey, endKey, shard.rangeStart, shard.rangeEnd)) {
        matchingShards.push(shard);
      }
    }

    return matchingShards;
  }

  private isInRange(key: any, rangeStart: any, rangeEnd: any): boolean {
    // Support different types
    if (typeof key === 'number') {
      return key >= rangeStart && key < rangeEnd;
    }

    if (typeof key === 'string') {
      return key >= rangeStart && key < rangeEnd;
    }

    if (key instanceof Date) {
      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      return key >= start && key < end;
    }

    return false;
  }

  private rangesOverlap(
    start1: any,
    end1: any,
    start2: any,
    end2: any
  ): boolean {
    // Ranges [start1, end1) and [start2, end2) overlap if:
    // start1 < end2 AND start2 < end1
    if (typeof start1 === 'number') {
      return start1 < end2 && start2 < end1;
    }

    if (typeof start1 === 'string') {
      return start1 < end2 && start2 < end1;
    }

    if (start1 instanceof Date) {
      const s1 = new Date(start1);
      const e1 = new Date(end1);
      const s2 = new Date(start2);
      const e2 = new Date(end2);
      return s1 < e2 && s2 < e1;
    }

    return false;
  }

  /**
   * Suggest optimal split points for rebalancing
   */
  suggestSplitPoints(
    shard: ShardConfig,
    targetCount: number
  ): { rangeStart: any; rangeEnd: any }[] {
    if (
      shard.rangeStart === undefined ||
      shard.rangeEnd === undefined
    ) {
      return [];
    }

    const splits: { rangeStart: any; rangeEnd: any }[] = [];

    if (typeof shard.rangeStart === 'number') {
      const start = shard.rangeStart as number;
      const end = shard.rangeEnd as number;
      const step = (end - start) / targetCount;

      for (let i = 0; i < targetCount; i++) {
        splits.push({
          rangeStart: start + i * step,
          rangeEnd: start + (i + 1) * step,
        });
      }
    }

    // Similar logic for dates, strings, etc.

    return splits;
  }
}
