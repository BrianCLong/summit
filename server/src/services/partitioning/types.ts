export enum PartitionStrategy {
  HASH = 'hash',
  RANGE = 'range',
  LIST = 'list',
}

export interface PartitionConfig {
  enabled: boolean;
  strategy: PartitionStrategy;
  shardCount: number;
  partitionKey?: string; // Default key for partitioning (e.g., 'id', 'tenantId')
}

export interface PartitioningServiceConfig extends PartitionConfig {
  redisPrefix?: string;
}
