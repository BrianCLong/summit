import { Pool, PoolConfig } from 'pg';

export interface ShardConfig {
  id: string;
  name: string;
  primary: DatabaseConfig;
  replicas?: DatabaseConfig[];
  weight?: number;
  rangeStart?: any;
  rangeEnd?: any;
  geography?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | object;
}

export interface ShardingConfig {
  shards: ShardConfig[];
  strategy: 'hash' | 'range' | 'geographic' | 'custom';
  shardKeyField: string;
  replicationFactor?: number;
  consistentHashingVirtualNodes?: number;
  defaultShard?: string;
}

export interface QueryContext {
  shardKey?: any;
  tenantId?: string;
  userId?: string;
  readonly?: boolean;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  useReplica?: boolean;
}

export interface ShardedQuery {
  sql: string;
  params?: any[];
  context: QueryContext;
}

export interface ShardedQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  shardId: string;
  executionTime: number;
  fromReplica: boolean;
}

export interface CrossShardQueryResult<T = any> {
  rows: T[];
  totalCount: number;
  shardResults: ShardedQueryResult<T>[];
  executionTime: number;
  mergedFrom: string[];
}

export interface ShardMetrics {
  shardId: string;
  queryCount: number;
  errorCount: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  activeConnections: number;
  queuedQueries: number;
}

export interface MigrationTask {
  id: string;
  sourceShard: string;
  targetShard: string;
  table: string;
  rangeStart: any;
  rangeEnd: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
