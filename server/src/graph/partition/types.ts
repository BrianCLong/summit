export type ShardId = string;
export type RegionId = string;

export interface ShardConfig {
  id: ShardId;
  uri: string;
  username?: string;
  password?: string;
  region: RegionId;
  isAirGapped?: boolean;
  capabilities?: {
    vectorIndex: boolean;
    graphAlgo: boolean;
  };
}

export interface PartitionStrategy {
  resolveShard(context: QueryContext): ShardId;
}

export interface QueryContext {
  tenantId?: string;
  region?: string;
  write?: boolean;
  vectorSearch?: boolean;
  nodeIds?: string[];
}

export interface VectorIndexConfig {
    dimension: number;
    metric: 'cosine' | 'euclidean' | 'dot_product';
    indexName: string;
}
