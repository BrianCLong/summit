import { QueryContext, PartitionStrategy, ShardId } from './types.js';
import { ShardManager } from './ShardManager.js';

export class LocalityAwarePartitionStrategy implements PartitionStrategy {
  private shardMap: Map<string, ShardId>; // region -> shardId

  constructor(shardMap: Map<string, ShardId>) {
    this.shardMap = shardMap;
  }

  resolveShard(context: QueryContext): ShardId {
    // 1. If explicit region provided, use it
    if (context.region && this.shardMap.has(context.region)) {
      return this.shardMap.get(context.region)!;
    }

    // 2. Fallback: Tenant affinity (mock implementation)
    // In a real system, we'd look up tenant->region mapping in a meta-store.
    // Here we'll just hash the tenantId to available shards if no region.
    const allShards = ShardManager.getInstance().getAllShards();
    if (allShards.length === 0) {
      throw new Error("No shards available");
    }

    if (context.tenantId) {
       const hash = this.simpleHash(context.tenantId);
       return allShards[hash % allShards.length];
    }

    // 3. Default: First available
    return allShards[0];
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
