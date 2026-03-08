"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardRouter = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const strategies_1 = require("./strategies");
const logger = (0, pino_1.default)({ name: 'ShardRouter' });
const tracer = api_1.trace.getTracer('database-sharding');
/**
 * Routes queries to appropriate shards based on shard key strategy
 */
class ShardRouter {
    shardManager;
    config;
    strategy;
    constructor(shardManager, config) {
        this.shardManager = shardManager;
        this.config = config;
        this.strategy = this.createStrategy(config.strategy);
    }
    createStrategy(strategyType) {
        switch (strategyType) {
            case 'hash':
                return new strategies_1.HashShardKey(this.config.consistentHashingVirtualNodes || 150);
            case 'range':
                return new strategies_1.RangeShardKey();
            case 'geographic':
                return new strategies_1.GeographicShardKey();
            default:
                throw new Error(`Unknown sharding strategy: ${strategyType}`);
        }
    }
    /**
     * Route a query to the appropriate shard
     */
    routeQuery(context) {
        const span = tracer.startSpan('ShardRouter.routeQuery');
        try {
            const shards = this.shardManager.getAllShards();
            if (shards.length === 0) {
                throw new Error('No shards available');
            }
            // If no shard key provided, use default shard or first shard
            if (!context.shardKey) {
                if (this.config.defaultShard) {
                    const defaultShard = shards.find((s) => s.id === this.config.defaultShard);
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
            logger.debug({
                shardKey: context.shardKey,
                shardId: shard.id,
                strategy: this.strategy.getName(),
            }, 'Query routed to shard');
            return shard;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Route a range query to all relevant shards
     */
    routeRangeQuery(startKey, endKey, context) {
        const span = tracer.startSpan('ShardRouter.routeRangeQuery');
        try {
            const shards = this.shardManager.getAllShards();
            if (shards.length === 0) {
                throw new Error('No shards available');
            }
            const targetShards = this.strategy.getShardsForRange(startKey, endKey, shards);
            span.setAttributes({
                'shard.count': targetShards.length,
                'strategy': this.strategy.getName(),
            });
            logger.debug({
                startKey,
                endKey,
                shardCount: targetShards.length,
                strategy: this.strategy.getName(),
            }, 'Range query routed to shards');
            return targetShards;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Get all shards for a broadcast query
     */
    routeBroadcastQuery() {
        return this.shardManager.getAllShards();
    }
    /**
     * Change the sharding strategy dynamically
     */
    changeStrategy(strategyType) {
        this.strategy = this.createStrategy(strategyType);
        logger.info({ strategy: strategyType }, 'Sharding strategy changed');
    }
}
exports.ShardRouter = ShardRouter;
