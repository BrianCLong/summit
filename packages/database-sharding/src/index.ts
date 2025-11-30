/**
 * Database Sharding Package
 *
 * Provides horizontal sharding capabilities for PostgreSQL with:
 * - Hash-based and range-based shard key strategies
 * - Shard routing and query distribution
 * - Cross-shard query optimization
 * - Read replica load balancing
 * - Connection pooling per shard
 */

export { ShardManager } from './ShardManager';
export { ShardRouter } from './ShardRouter';
export { QueryDistributor } from './QueryDistributor';
export { ShardKeyStrategy, HashShardKey, RangeShardKey, GeographicShardKey } from './strategies';
export { CrossShardQueryExecutor } from './CrossShardQueryExecutor';
export { ReadReplicaLoadBalancer } from './ReadReplicaLoadBalancer';
export { ShardConnectionPool } from './ShardConnectionPool';
export * from './types';
