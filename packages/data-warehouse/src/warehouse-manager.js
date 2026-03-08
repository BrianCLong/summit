"use strict";
/**
 * Summit Data Warehouse Manager
 *
 * Central management interface for the data warehouse
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseManager = void 0;
const columnar_storage_engine_1 = require("./storage/columnar-storage-engine");
const distributed_executor_1 = require("./query/distributed-executor");
const query_planner_1 = require("./query/query-planner");
const result_cache_1 = require("./query/result-cache");
const workload_manager_1 = require("./workload/workload-manager");
const compute_scaler_1 = require("./workload/compute-scaler");
class WarehouseManager {
    storageEngine;
    queryExecutor;
    queryPlanner;
    resultCache;
    workloadManager;
    computeScaler;
    constructor(config) {
        const primaryPool = config.pools[0];
        this.storageEngine = new columnar_storage_engine_1.ColumnarStorageEngine(primaryPool);
        this.queryExecutor = new distributed_executor_1.DistributedQueryExecutor(config.pools, config.maxParallelism || 32);
        this.queryPlanner = new query_planner_1.QueryPlanner(primaryPool);
        this.resultCache = new result_cache_1.ResultCache(config.cacheSize);
        this.workloadManager = new workload_manager_1.WorkloadManager({
            maxConcurrentQueries: config.maxConcurrentQueries || 100,
            maxMemoryPerQuery: 1024 * 1024 * 1024,
            timeoutMs: 300000,
        });
        this.computeScaler = new compute_scaler_1.ComputeScaler();
    }
    async createTable(schema) {
        return this.storageEngine.createTable(schema);
    }
    async insertData(tableName, columns, data) {
        return this.storageEngine.insertData(tableName, columns, data);
    }
    async query(sql, priority = workload_manager_1.QueryPriority.MEDIUM) {
        const request = { sql };
        // Generate query plan
        const plan = await this.queryPlanner.plan(request);
        // Check cache
        const cached = await this.resultCache.get(plan.queryId);
        if (cached) {
            return cached;
        }
        // Queue if needed
        if (!this.workloadManager.canExecute(priority)) {
            await this.workloadManager.queue(plan.queryId, priority);
        }
        // Execute
        await this.workloadManager.start(plan.queryId, priority);
        try {
            const result = await this.queryExecutor.execute(plan);
            // Cache result
            await this.resultCache.set(plan.queryId, plan.queryId, result.rows, {
                columns: [],
                executionTimeMs: result.metrics.totalDurationMs,
            });
            return result.rows;
        }
        finally {
            await this.workloadManager.complete(plan.queryId);
        }
    }
    async getStorageStats(tableName) {
        return this.storageEngine.getStorageStats(tableName);
    }
    getCacheStats() {
        return this.resultCache.getStats();
    }
}
exports.WarehouseManager = WarehouseManager;
