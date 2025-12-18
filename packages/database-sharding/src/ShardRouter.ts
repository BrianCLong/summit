import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { ShardManager } from './ShardManager';
import {
  ShardKeyStrategy,
  HashShardKey,
  RangeShardKey,
  GeographicShardKey,
} from './strategies';
import { ShardConfig, ShardingConfig, QueryContext } from './types';

const logger = pino({ name: 'ShardRouter' });
const tracer = trace.getTracer('database-sharding');

/**
 * Routes queries to appropriate shards based on shard key strategy
 */
export class ShardRouter {
  private strategy: ShardKeyStrategy;

  constructor(
    private shardManager: ShardManager,
    private config: ShardingConfig
  ) {
    this.strategy = this.createStrategy(config.strategy);
  }

  private createStrategy(strategyType: string): ShardKeyStrategy {
    switch (strategyType) {
      case 'hash':
        return new HashShardKey(
          this.config.consistentHashingVirtualNodes || 150
        );
      case 'range':
        return new RangeShardKey();
      case 'geographic':
        return new GeographicShardKey();
      default:
        throw new Error(`Unknown sharding strategy: ${strategyType}`);
    }
  }

  /**
   * Route a query to the appropriate shard
   */
  routeQuery(context: QueryContext): ShardConfig {
    const span = tracer.startSpan('ShardRouter.routeQuery');

    try {
      const shards = this.shardManager.getAllShards();

      if (shards.length === 0) {
        throw new Error('No shards available');
      }

      // If no shard key provided, use default shard or first shard
      if (!context.shardKey) {
        if (this.config.defaultShard) {
          const defaultShard = shards.find(
            (s) => s.id === this.config.defaultShard
          );
          if (defaultShard) {
            span.setAttribute('shard.id', defaultShard.id);
            span.setAttribute('routing', 'default');
            return defaultShard;
          }
        }

        span.setAttribute('shard.id', shards[0].id);
        span.setAttribute('routing', 'first');
        return shards[0];
      }

      // Use strategy to determine shard
      const shard = this.strategy.getShard(context.shardKey, shards);

      span.setAttributes({
        'shard.id': shard.id,
        'strategy': this.strategy.getName(),
        'routing': 'strategy',
      });

      logger.debug(
        {
          shardKey: context.shardKey,
          shardId: shard.id,
          strategy: this.strategy.getName(),
        },
        'Query routed to shard'
      );

      return shard;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Route a range query to all relevant shards
   */
  routeRangeQuery(
    startKey: any,
    endKey: any,
    context: QueryContext
  ): ShardConfig[] {
    const span = tracer.startSpan('ShardRouter.routeRangeQuery');

    try {
      const shards = this.shardManager.getAllShards();

      if (shards.length === 0) {
        throw new Error('No shards available');
      }

      const targetShards = this.strategy.getShardsForRange(
        startKey,
        endKey,
        shards
      );

      span.setAttributes({
        'shard.count': targetShards.length,
        'strategy': this.strategy.getName(),
      });

      logger.debug(
        {
          startKey,
          endKey,
          shardCount: targetShards.length,
          strategy: this.strategy.getName(),
        },
        'Range query routed to shards'
      );

      return targetShards;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get all shards for a broadcast query
   */
  routeBroadcastQuery(): ShardConfig[] {
    return this.shardManager.getAllShards();
  }

  /**
   * Change the sharding strategy dynamically
   */
  changeStrategy(strategyType: string): void {
    this.strategy = this.createStrategy(strategyType);
    logger.info({ strategy: strategyType }, 'Sharding strategy changed');
  }
}
