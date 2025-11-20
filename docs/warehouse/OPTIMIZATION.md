# Data Warehouse Optimization Guide

## Query Optimization

### 1. Cost-Based Optimization

Summit automatically optimizes queries using:

- **Statistics-based cardinality estimation**
- **Join order optimization**
- **Predicate pushdown**
- **Partition pruning**
- **Parallel execution planning**

### 2. Query Rewriting

Common optimizations:

```sql
-- Before: Subquery
SELECT * FROM sales
WHERE product_id IN (SELECT id FROM products WHERE category = 'Electronics');

-- After: Join (automatically rewritten)
SELECT s.* FROM sales s
JOIN products p ON s.product_id = p.id
WHERE p.category = 'Electronics';
```

### 3. Materialized Views

Create MVs for expensive queries:

```typescript
await optimizer.mvManager.createMaterializedView({
  name: 'mv_daily_sales_summary',
  query: `
    SELECT
      DATE_TRUNC('day', sale_date) as day,
      product_id,
      SUM(quantity) as total_quantity,
      SUM(revenue) as total_revenue,
      AVG(unit_price) as avg_price
    FROM fact_sales
    GROUP BY day, product_id
  `,
  refreshStrategy: 'incremental',
  indexes: ['day', 'product_id']
});
```

## Storage Optimization

### 1. Compression Analysis

Monitor compression effectiveness:

```typescript
const stats = await warehouse.getStorageStats('fact_sales');

stats.columnStats.forEach(col => {
  const ratio = col.uncompressedSize / col.compressedSize;
  console.log(`${col.column}: ${ratio.toFixed(2)}x compression`);

  if (ratio < 3) {
    console.log(`⚠️  Poor compression on ${col.column}`);
  }
});
```

### 2. Data Distribution

Ensure even data distribution across partitions:

```sql
-- Check partition sizes
SELECT
  partition_name,
  pg_size_pretty(pg_table_size(partition_name)) as size,
  COUNT(*) as row_count
FROM information_schema.tables
WHERE table_name LIKE 'fact_sales_%'
GROUP BY partition_name
ORDER BY size DESC;
```

### 3. Vacuum and Analyze

Regular maintenance:

```sql
-- Update statistics
ANALYZE fact_sales;

-- Reclaim space
VACUUM fact_sales;

-- Full vacuum (requires lock)
VACUUM FULL fact_sales;
```

## Workload Management

### Priority-Based Execution

```typescript
// Critical business queries
await warehouse.query(criticalSql, QueryPriority.CRITICAL);

// Interactive analytics
await warehouse.query(analyticsSql, QueryPriority.HIGH);

// Background ETL
await warehouse.query(etlSql, QueryPriority.LOW);

// Batch reports
await warehouse.query(batchSql, QueryPriority.BATCH);
```

### Concurrency Control

```typescript
const workloadConfig = {
  maxConcurrentQueries: 100,
  maxMemoryPerQuery: 2 * 1024 * 1024 * 1024, // 2GB
  timeoutMs: 300000 // 5 minutes
};
```

### Resource Pools

Separate resource pools for different workloads:

```
┌──────────────────┐
│ Critical Pool    │  30% resources, Max 10 concurrent
├──────────────────┤
│ Interactive Pool │  50% resources, Max 50 concurrent
├──────────────────┤
│ Batch Pool       │  20% resources, Max 100 concurrent
└──────────────────┘
```

## Cache Optimization

### Result Cache Tuning

```typescript
// Configure cache size
const cache = new ResultCache(
  10 * 1024 * 1024 * 1024 // 10GB
);

// Cache warming for frequently used queries
await cache.warmCache([
  { queryHash: 'hash1', queryId: 'q1', result: data1, metadata: meta1 },
  { queryHash: 'hash2', queryId: 'q2', result: data2, metadata: meta2 }
]);

// Monitor cache performance
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
```

### Metadata Cache

Cache table and column statistics:

```typescript
// Force statistics refresh
await queryPlanner.clearCaches();

// Collect fresh statistics
await pool.query('ANALYZE fact_sales');
```

## Partitioning Optimization

### Partition Pruning

Ensure predicates enable partition pruning:

```sql
-- Good: Uses partition key
SELECT * FROM fact_sales
WHERE sale_date >= '2024-01-01'
  AND sale_date < '2024-02-01';

-- Bad: Function on partition key prevents pruning
SELECT * FROM fact_sales
WHERE DATE_TRUNC('month', sale_date) = '2024-01-01';
```

### Dynamic Partition Pruning

Automatically enabled for:
- Range predicates on partition keys
- IN clauses with partition key
- JOIN conditions on partition keys

## Join Optimization

### Broadcast vs Hash Join

```typescript
// Small dimension (< 10MB): Broadcast join
SELECT * FROM fact_sales s
JOIN dim_product p ON s.product_key = p.product_key;

// Large dimension: Hash join with partitioning
SELECT * FROM fact_sales s
JOIN fact_returns r ON s.transaction_id = r.transaction_id;
```

### Join Order

Optimal join order (smallest to largest):

```sql
-- Optimal
SELECT *
FROM dim_date d
JOIN dim_product p ON ...
JOIN fact_sales s ON ...;

-- Suboptimal
SELECT *
FROM fact_sales s
JOIN dim_date d ON ...
JOIN dim_product p ON ...;
```

## Monitoring and Tuning

### Query Performance Tracking

```typescript
warehouse.queryExecutor.on('query:completed', (event) => {
  const { queryId, metrics } = event;

  if (metrics.totalDurationMs > 10000) {
    console.log(`⚠️  Slow query detected: ${queryId}`);
    console.log(`   Duration: ${metrics.totalDurationMs}ms`);
    console.log(`   Rows: ${metrics.rowsProcessed}`);
    console.log(`   Workers: ${metrics.workersUsed}`);
  }
});
```

### Storage Growth Monitoring

```typescript
setInterval(async () => {
  const tables = ['fact_sales', 'fact_returns', 'fact_inventory'];

  for (const table of tables) {
    const stats = await warehouse.getStorageStats(table);
    const growthRate = calculateGrowthRate(stats);

    if (growthRate > 0.1) { // 10% growth
      console.log(`⚠️  High growth rate on ${table}: ${(growthRate * 100).toFixed(2)}%/day`);
    }
  }
}, 3600000); // Every hour
```

### Workload Analysis

```typescript
// Get top queries by execution time
const slowQueries = await pool.query(`
  SELECT
    query,
    calls,
    total_time / calls as avg_time,
    min_time,
    max_time
  FROM pg_stat_statements
  WHERE calls > 10
  ORDER BY total_time DESC
  LIMIT 10
`);

slowQueries.rows.forEach(q => {
  console.log(`Query: ${q.query}`);
  console.log(`Calls: ${q.calls}, Avg: ${q.avg_time}ms`);
});
```

## Best Practices Summary

1. **Always define sort keys** that match query patterns
2. **Monitor compression ratios** and adjust encoding
3. **Use materialized views** for expensive aggregations
4. **Implement query priorities** for mixed workloads
5. **Regular statistics updates** (weekly or after large loads)
6. **Partition large tables** (> 100GB)
7. **Enable result caching** for repeated queries
8. **Monitor and tune** workload concurrency
9. **Use zone maps** for aggressive pruning
10. **Review slow queries** and create indexes/MVs

## Performance Targets

| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| Compression Ratio | > 10x | 5-10x | < 5x |
| Cache Hit Rate | > 80% | 60-80% | < 60% |
| Query Response (p95) | < 1s | 1-5s | > 5s |
| Storage Growth | < 5%/day | 5-10%/day | > 10%/day |
| Partition Pruning | > 90% | 70-90% | < 70% |
| Worker Utilization | 70-90% | 50-70% | < 50% or > 90% |
