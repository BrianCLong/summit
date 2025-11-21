/**
 * Sharding Strategy for Distributed Data
 */

export enum ShardingType {
  HASH = 'HASH',
  RANGE = 'RANGE',
  GEOGRAPHIC = 'GEOGRAPHIC',
  CUSTOM = 'CUSTOM',
}

export class ShardingStrategy {
  constructor(private type: ShardingType) {}

  getShard(value: any, totalShards: number): number {
    switch (this.type) {
      case ShardingType.HASH:
        return this.hashShard(value, totalShards);
      default:
        return 0;
    }
  }

  private hashShard(value: any, totalShards: number): number {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % totalShards;
  }
}
