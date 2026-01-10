## Database Performance & Optimization

### Optimization Targets (MVP-4 GA)

| Metric | Target | Actual (Oct 2025) |
|--------|--------|-------------------|
| Query Response Time (p90) | <100ms | **Pending Post-GA Baseline** |
| Query Response Time (p99) | <500ms | **Pending Post-GA Baseline** |
| Cache Hit Rate | >90% | **Pending Post-GA Baseline** |
| Database Pool Utilization | <80% | **Pending Post-GA Baseline** |
| N+1 Queries | 0 | **Pending Post-GA Baseline** |
| Slow Query Rate | <1% | **Pending Post-GA Baseline** |

### Indexing Strategy

1.  **Primary Keys:** All tables use UUID/ULID primary keys.
2.  **Foreign Keys:** All foreign keys are indexed.
3.  **Search Fields:** Trigram indexes on `name`, `title`, `description`.
4.  **JSONB:** GIN indexes on frequently queried JSONB paths (e.g., `metadata.source`).
5.  **Timestamps:** BRIN indexes on `created_at` for time-series/audit logs.

### Query Optimization Rules

1.  **Selectivity:** Always filter by `tenant_id` first.
2.  **Pagination:** Use cursor-based pagination (keyset), avoid OFFSET/LIMIT for large sets.
3.  **Joins:** Prefer `LEFT JOIN` for optional relationships, avoid Cartesian products.
4.  **Projections:** Select only needed columns (no `SELECT *`).
5.  **Batching:** Use `DataLoader` for resolving relationships to prevent N+1.

### Connection Pooling

- **Service:** `pg-pool` / `HikariCP`
- **Max Connections:** Configured per service (default 10).
- **Idle Timeout:** 30 seconds.
- **Connection Lifetime:** 30 minutes.

### Caching Layer

- **L1 Cache:** Request-scoped (DataLoader).
- **L2 Cache:** Shared Redis (Entity Cache).
- **TTL:** Variable based on volatility (Config: 5m default).
- **Invalidation:** Event-driven via mutation hooks.

### Monitoring & Alerts

- **Slow Query Log:** Enabled (>200ms).
- **Deadlock Detection:** Enabled.
- **Connection Saturation:** Alert at >80% pool usage.
- **Cache Miss Rate:** Alert at >50%.
