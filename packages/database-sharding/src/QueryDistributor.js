"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryDistributor = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'QueryDistributor' });
const tracer = api_1.trace.getTracer('database-sharding');
/**
 * Distributes and executes queries across shards
 */
class QueryDistributor {
    shardManager;
    shardRouter;
    constructor(shardManager, shardRouter) {
        this.shardManager = shardManager;
        this.shardRouter = shardRouter;
    }
    /**
     * Execute a query on a single shard
     */
    async executeOnShard(query) {
        const span = tracer.startSpan('QueryDistributor.executeOnShard');
        const startTime = Date.now();
        try {
            // Route to appropriate shard
            const shard = this.shardRouter.routeQuery(query.context);
            const pool = this.shardManager.getConnectionPool(shard.id);
            if (!pool) {
                throw new Error(`Connection pool not found for shard ${shard.id}`);
            }
            // Execute on primary or replica based on context
            const useReplica = query.context.readonly !== false &&
                (query.context.useReplica === true || query.context.readonly === true);
            const result = useReplica
                ? await pool.queryReplica(query.sql, query.params)
                : await pool.queryPrimary(query.sql, query.params);
            const executionTime = Date.now() - startTime;
            // Update metrics
            const metrics = this.shardManager.getMetrics(shard.id);
            if (metrics) {
                this.shardManager.updateMetrics(shard.id, {
                    queryCount: metrics.queryCount + 1,
                    avgLatency: (metrics.avgLatency * metrics.queryCount + executionTime) /
                        (metrics.queryCount + 1),
                });
            }
            span.setAttributes({
                'shard.id': shard.id,
                'query.rows': result.rowCount || 0,
                'query.duration': executionTime,
                'query.replica': useReplica,
            });
            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
                shardId: shard.id,
                executionTime,
                fromReplica: useReplica,
            };
        }
        catch (error) {
            span.recordException(error);
            logger.error({ error, query: query.sql }, 'Query execution failed');
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Execute a query across multiple shards and merge results
     */
    async executeAcrossShards(shards, query, mergeStrategy = 'union') {
        const span = tracer.startSpan('QueryDistributor.executeAcrossShards');
        const startTime = Date.now();
        try {
            // Execute query on all shards in parallel
            const queryPromises = shards.map(async (shard) => {
                const pool = this.shardManager.getConnectionPool(shard.id);
                if (!pool) {
                    throw new Error(`Connection pool not found for shard ${shard.id}`);
                }
                const useReplica = query.context.readonly !== false &&
                    (query.context.useReplica === true || query.context.readonly === true);
                const result = useReplica
                    ? await pool.queryReplica(query.sql, query.params)
                    : await pool.queryPrimary(query.sql, query.params);
                return {
                    rows: result.rows,
                    rowCount: result.rowCount || 0,
                    shardId: shard.id,
                    executionTime: Date.now() - startTime,
                    fromReplica: useReplica,
                };
            });
            const shardResults = await Promise.all(queryPromises);
            // Merge results based on strategy
            const mergedRows = this.mergeResults(shardResults, mergeStrategy);
            const executionTime = Date.now() - startTime;
            span.setAttributes({
                'shard.count': shards.length,
                'query.totalRows': mergedRows.length,
                'query.duration': executionTime,
                'merge.strategy': mergeStrategy,
            });
            return {
                rows: mergedRows,
                totalCount: mergedRows.length,
                shardResults,
                executionTime,
                mergedFrom: shards.map((s) => s.id),
            };
        }
        catch (error) {
            span.recordException(error);
            logger.error({ error, query: query.sql }, 'Cross-shard query failed');
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Execute a query on all shards (broadcast)
     */
    async broadcast(query) {
        const shards = this.shardRouter.routeBroadcastQuery();
        return this.executeAcrossShards(shards, query);
    }
    /**
     * Execute a range query across relevant shards
     */
    async executeRangeQuery(startKey, endKey, query) {
        const shards = this.shardRouter.routeRangeQuery(startKey, endKey, query.context);
        return this.executeAcrossShards(shards, query);
    }
    /**
     * Merge results from multiple shards
     */
    mergeResults(results, strategy) {
        if (strategy === 'union') {
            // Simple concatenation
            return results.flatMap((r) => r.rows);
        }
        if (strategy === 'intersect') {
            // Find common rows (requires comparison logic)
            // This is a simplified version
            if (results.length === 0)
                return [];
            if (results.length === 1)
                return results[0].rows;
            if (results.length === 0) {
                return [];
            }
            if (results.length === 1) {
                return results[0].rows;
            }
            // Intersect all result sets
            let intersection = results[0].rows;
            for (let i = 1; i < results.length; i++) {
                intersection = intersection.filter((row) => results[i].rows.some((r) => JSON.stringify(r) === JSON.stringify(row)));
            }
            return intersection;
        }
        // Custom strategy would be implemented by subclasses
        return results.flatMap((r) => r.rows);
    }
    /**
     * Execute a query with automatic retry on failure
     */
    async executeWithRetry(query, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.executeOnShard(query);
            }
            catch (error) {
                lastError = error;
                logger.warn({ attempt, maxRetries, error }, 'Query failed, retrying...');
                if (attempt < maxRetries) {
                    // Exponential backoff
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
                }
            }
        }
        throw lastError || new Error('Query failed after retries');
    }
    /**
     * Explain query execution plan across shards
     */
    async explainQuery(query) {
        const shard = this.shardRouter.routeQuery(query.context);
        const pool = this.shardManager.getConnectionPool(shard.id);
        if (!pool) {
            throw new Error(`Connection pool not found for shard ${shard.id}`);
        }
        const explainSql = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${query.sql}`;
        const result = await pool.queryPrimary(explainSql, query.params);
        return {
            shardId: shard.id,
            plan: result.rows[0],
        };
    }
}
exports.QueryDistributor = QueryDistributor;
