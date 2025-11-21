/**
 * Summit Data Warehouse Manager
 *
 * Central management interface for the data warehouse
 */

import { Pool } from 'pg';
import { ColumnarStorageEngine, TableSchema } from './storage/columnar-storage-engine';
import { DistributedQueryExecutor } from './query/distributed-executor';
import { QueryPlanner, QueryRequest } from './query/query-planner';
import { ResultCache } from './query/result-cache';
import { WorkloadManager, QueryPriority } from './workload/workload-manager';
import { ComputeScaler } from './workload/compute-scaler';

export interface WarehouseConfig {
  pools: Pool[];
  maxParallelism?: number;
  cacheSize?: number;
  maxConcurrentQueries?: number;
}

export class WarehouseManager {
  private storageEngine: ColumnarStorageEngine;
  private queryExecutor: DistributedQueryExecutor;
  private queryPlanner: QueryPlanner;
  private resultCache: ResultCache;
  private workloadManager: WorkloadManager;
  private computeScaler: ComputeScaler;

  constructor(config: WarehouseConfig) {
    const primaryPool = config.pools[0];

    this.storageEngine = new ColumnarStorageEngine(primaryPool);
    this.queryExecutor = new DistributedQueryExecutor(
      config.pools,
      config.maxParallelism || 32,
    );
    this.queryPlanner = new QueryPlanner(primaryPool);
    this.resultCache = new ResultCache(config.cacheSize);
    this.workloadManager = new WorkloadManager({
      maxConcurrentQueries: config.maxConcurrentQueries || 100,
      maxMemoryPerQuery: 1024 * 1024 * 1024,
      timeoutMs: 300000,
    });
    this.computeScaler = new ComputeScaler();
  }

  async createTable(schema: TableSchema): Promise<void> {
    return this.storageEngine.createTable(schema);
  }

  async insertData(
    tableName: string,
    columns: string[],
    data: any[][],
  ): Promise<void> {
    return this.storageEngine.insertData(tableName, columns, data);
  }

  async query(
    sql: string,
    priority: QueryPriority = QueryPriority.MEDIUM,
  ): Promise<any[]> {
    const request: QueryRequest = { sql };

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
      await this.resultCache.set(
        plan.queryId,
        plan.queryId,
        result.rows,
        {
          columns: [],
          executionTimeMs: result.metrics.totalDurationMs,
        },
      );

      return result.rows;
    } finally {
      await this.workloadManager.complete(plan.queryId);
    }
  }

  async getStorageStats(tableName: string) {
    return this.storageEngine.getStorageStats(tableName);
  }

  getCacheStats() {
    return this.resultCache.getStats();
  }
}
