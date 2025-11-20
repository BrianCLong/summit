import murmurhash from 'murmurhash';
import { ShardKeyStrategy } from './ShardKeyStrategy';
import { ShardConfig } from '../types';

/**
 * Hash-based sharding using consistent hashing with virtual nodes
 */
export class HashShardKey implements ShardKeyStrategy {
  private virtualNodes: number;
  private hashRing: Map<number, string> = new Map();
  private sortedHashes: number[] = [];

  constructor(virtualNodes: number = 150) {
    this.virtualNodes = virtualNodes;
  }

  /**
   * Initialize the hash ring with virtual nodes for each shard
   */
  initialize(shards: ShardConfig[]): void {
    this.hashRing.clear();
    this.sortedHashes = [];

    for (const shard of shards) {
      const weight = shard.weight || 1;
      const nodeCount = Math.floor(this.virtualNodes * weight);

      for (let i = 0; i < nodeCount; i++) {
        const virtualNodeKey = `${shard.id}:${i}`;
        const hash = murmurhash.v3(virtualNodeKey);
        this.hashRing.set(hash, shard.id);
        this.sortedHashes.push(hash);
      }
    }

    this.sortedHashes.sort((a, b) => a - b);
  }

  getName(): string {
    return 'hash';
  }

  getShard(key: any, shards: ShardConfig[]): ShardConfig {
    if (this.sortedHashes.length === 0) {
      this.initialize(shards);
    }

    const keyStr = this.normalizeKey(key);
    const hash = murmurhash.v3(keyStr);

    // Find the first hash >= our key hash (clockwise on the ring)
    let index = this.sortedHashes.findIndex((h) => h >= hash);

    // If not found, wrap around to the first node
    if (index === -1) {
      index = 0;
    }

    const shardId = this.hashRing.get(this.sortedHashes[index])!;
    const shard = shards.find((s) => s.id === shardId);

    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }

    return shard;
  }

  getShardsForRange(
    startKey: any,
    endKey: any,
    shards: ShardConfig[]
  ): ShardConfig[] {
    // For hash-based sharding, range queries require all shards
    // because data is distributed randomly
    return shards;
  }

  private normalizeKey(key: any): string {
    if (typeof key === 'string') {
      return key;
    }
    if (typeof key === 'number') {
      return key.toString();
    }
    if (typeof key === 'object' && key !== null) {
      return JSON.stringify(key);
    }
    return String(key);
  }

  /**
   * Add a new shard to the hash ring
   */
  addShard(shard: ShardConfig): void {
    const weight = shard.weight || 1;
    const nodeCount = Math.floor(this.virtualNodes * weight);

    for (let i = 0; i < nodeCount; i++) {
      const virtualNodeKey = `${shard.id}:${i}`;
      const hash = murmurhash.v3(virtualNodeKey);
      this.hashRing.set(hash, shard.id);
      this.sortedHashes.push(hash);
    }

    this.sortedHashes.sort((a, b) => a - b);
  }

  /**
   * Remove a shard from the hash ring
   */
  removeShard(shardId: string): void {
    const hashesToRemove: number[] = [];

    for (const [hash, id] of this.hashRing.entries()) {
      if (id === shardId) {
        hashesToRemove.push(hash);
      }
    }

    for (const hash of hashesToRemove) {
      this.hashRing.delete(hash);
      const index = this.sortedHashes.indexOf(hash);
      if (index > -1) {
        this.sortedHashes.splice(index, 1);
      }
    }
  }
}
