# Performance Operations Guide

## Quick Start

### Running Load Tests

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run baseline load test
k6 run scripts/performance-testing/load-test.js

# Run with custom parameters
BASE_URL=https://api.intelgraph.io API_KEY=your-key k6 run scripts/performance-testing/load-test.js
```

### Running Chaos Tests

```bash
# Install Chaos Mesh
curl -sSL https://mirrors.chaos-mesh.org/v2.5.0/install.sh | bash

# Run chaos engineering tests
cd scripts/performance-testing
./chaos-test.sh
```

### Running Benchmarks

```bash
# Full benchmark suite
./scripts/performance-testing/benchmark.sh

# View results
cat performance-results/$(ls -t performance-results | head -1)/SUMMARY.md
```

---

## Performance Tuning

### Database Optimization

#### PostgreSQL Configuration
```sql
-- Increase shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '16GB';

-- Increase work memory for complex queries
ALTER SYSTEM SET work_mem = '256MB';

-- Enable parallel query execution
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Optimize checkpoint behavior
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';

-- Apply changes
SELECT pg_reload_conf();
```

#### Index Optimization
```sql
-- Identify missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- Create appropriate indexes
CREATE INDEX CONCURRENTLY idx_entities_tenant_created
ON entities(tenant_id, created_at DESC);

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes
DROP INDEX CONCURRENTLY idx_unused_index;
```

#### Query Performance Analysis
```sql
-- Enable query timing
SET track_io_timing = on;

-- Explain query plan
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT e.*, r.*
FROM entities e
LEFT JOIN relationships r ON r.source_id = e.id
WHERE e.tenant_id = 'tenant-123'
LIMIT 100;

-- Identify slow queries
SELECT query, calls, total_exec_time, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Redis Optimization

```bash
# Monitor Redis performance
redis-cli --stat

# Check memory usage
redis-cli info memory

# Optimize memory
redis-cli config set maxmemory 8gb
redis-cli config set maxmemory-policy allkeys-lru

# Enable persistence for durability
redis-cli config set save "900 1 300 10 60 10000"
redis-cli config set appendonly yes

# Monitor slow commands
redis-cli slowlog get 10
```

### Kubernetes Resource Tuning

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n intelgraph

# Adjust resource requests/limits
kubectl set resources deployment/intelgraph-api \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2,memory=4Gi \
  -n intelgraph

# Monitor HPA status
kubectl get hpa -n intelgraph -w

# View HPA events
kubectl describe hpa intelgraph-api-hpa -n intelgraph
```

---

## Monitoring and Alerting

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m]))

# Database connection pool usage
pg_connections_active / pg_connections_max

# Pod CPU usage
sum(rate(container_cpu_usage_seconds_total{pod=~"intelgraph-api.*"}[5m])) by (pod)

# Memory usage
container_memory_working_set_bytes{pod=~"intelgraph-api.*"}
```

### Alert Rules

```yaml
groups:
- name: performance
  interval: 30s
  rules:
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    annotations:
      summary: "High API latency detected"
      description: "p95 latency is {{ $value }}s"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
    for: 2m
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"

  - alert: CacheMissRate
    expr: 1 - (sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m]))) > 0.2
    for: 10m
    annotations:
      summary: "High cache miss rate"
      description: "Cache miss rate is {{ $value | humanizePercentage }}"

  - alert: DatabaseConnectionPoolExhausted
    expr: pg_connections_active / pg_connections_max > 0.9
    for: 5m
    annotations:
      summary: "Database connection pool nearly exhausted"
      description: "{{ $value | humanizePercentage }} of connections in use"
```

### Grafana Dashboards

Import pre-built dashboards:
```bash
# API Dashboard
curl -o /tmp/api-dashboard.json https://grafana.com/api/dashboards/12345/revisions/1/download
grafana-cli dashboards import /tmp/api-dashboard.json

# Kubernetes Dashboard
grafana-cli dashboards install 315

# PostgreSQL Dashboard
grafana-cli dashboards install 9628
```

---

## Troubleshooting

### High Latency

```bash
# 1. Check pod CPU/memory
kubectl top pods -n intelgraph

# 2. Check if HPA is scaling
kubectl get hpa -n intelgraph

# 3. Check for slow queries
kubectl exec -it postgres-0 -n intelgraph -- psql -U summit -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 4. Check cache hit rate
redis-cli info stats | grep hit

# 5. Check network latency
kubectl exec -it intelgraph-api-xxx -n intelgraph -- curl -w "@curl-format.txt" -o /dev/null -s http://postgres:5432
```

### High Error Rate

```bash
# 1. Check recent errors in logs
kubectl logs -n intelgraph -l app=intelgraph-api --tail=100 | grep ERROR

# 2. Check service mesh metrics
kubectl exec -it istio-proxy -c istio-proxy -n intelgraph -- pilot-agent request GET stats

# 3. Check circuit breaker status
kubectl get destinationrules -n intelgraph -o yaml | grep -A 10 outlierDetection

# 4. Check for pod restarts
kubectl get pods -n intelgraph -o json | jq '.items[] | {name: .metadata.name, restarts: .status.containerStatuses[0].restartCount}'
```

### Memory Issues

```bash
# 1. Check memory usage
kubectl top pods -n intelgraph --sort-by=memory

# 2. Check for memory leaks
kubectl exec -it intelgraph-api-xxx -n intelgraph -- node --expose-gc --inspect=0.0.0.0:9229 dist/index.js

# 3. Heap dump analysis
kubectl exec -it intelgraph-api-xxx -n intelgraph -- kill -USR2 $(pgrep node)
kubectl cp intelgraph/intelgraph-api-xxx:/tmp/heap-snapshot.heapsnapshot ./heap-snapshot.heapsnapshot

# 4. Adjust memory limits
kubectl set resources deployment/intelgraph-api --limits=memory=8Gi -n intelgraph
```

### Database Performance

```bash
# 1. Check active connections
kubectl exec -it postgres-0 -n intelgraph -- psql -U summit -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 2. Check for locks
kubectl exec -it postgres-0 -n intelgraph -- psql -U summit -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 3. Check for bloat
kubectl exec -it postgres-0 -n intelgraph -- psql -U summit -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# 4. Vacuum analyze
kubectl exec -it postgres-0 -n intelgraph -- psql -U summit -c "VACUUM ANALYZE;"
```

---

## Capacity Planning

### Estimation Formulas

```python
# API capacity estimation
requests_per_second = concurrent_users * (requests_per_user_per_minute / 60)
required_pods = requests_per_second / (requests_per_pod_per_second * 0.7)  # 70% target utilization

# Database capacity
queries_per_second = requests_per_second * average_queries_per_request
required_db_shards = queries_per_second / (queries_per_shard_per_second * 0.8)

# Cache capacity
cache_entries = daily_active_users * average_cached_items_per_user
required_cache_memory = cache_entries * average_entry_size_bytes * 1.5  # 50% overhead

# Storage capacity
monthly_data_growth = new_users_per_month * data_per_user
yearly_storage_need = monthly_data_growth * 12 * 1.3  # 30% buffer
```

### Scaling Triggers

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | > 70% | > 85% | Scale up pods |
| Memory Usage | > 75% | > 90% | Scale up pods / Add nodes |
| Request Latency (p95) | > 500ms | > 1s | Scale up, optimize queries |
| Error Rate | > 1% | > 5% | Investigate, rollback if needed |
| Cache Hit Rate | < 80% | < 70% | Increase cache size, warm cache |
| Database Connections | > 80% | > 95% | Increase pool size, add replicas |
| Queue Depth | > 1000 | > 5000 | Scale up workers |

---

## Best Practices

### Code-Level Optimization

1. **Use DataLoader for GraphQL**: Eliminate N+1 queries
2. **Implement pagination**: Limit result sets
3. **Add database indexes**: Cover frequently queried fields
4. **Cache aggressively**: Cache expensive computations
5. **Use connection pooling**: Reuse database connections
6. **Async processing**: Offload long-running tasks to queues
7. **Lazy loading**: Only load data when needed
8. **Compress responses**: Enable gzip/brotli compression

### Infrastructure Optimization

1. **Use CDN**: Offload static assets to edge locations
2. **Enable HTTP/2**: Multiplex connections
3. **Implement rate limiting**: Protect against abuse
4. **Use read replicas**: Distribute read load
5. **Shard databases**: Horizontal scaling for massive datasets
6. **Enable autoscaling**: Scale dynamically based on load
7. **Use circuit breakers**: Prevent cascading failures
8. **Implement health checks**: Detect and isolate unhealthy instances

---

## Performance Budget

Enforce performance budgets in CI/CD:

```yaml
# .github/workflows/performance-check.yml
name: Performance Check
on: [pull_request]
jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Run performance tests
      run: k6 run --quiet scripts/performance-testing/load-test.js
    - name: Check thresholds
      run: |
        # Fail if p95 latency > 500ms
        # Fail if error rate > 1%
        # Fail if throughput < 1000 req/sec
```

---

## Continuous Optimization

1. **Weekly Performance Reviews**: Review metrics, identify trends
2. **Monthly Capacity Planning**: Project future needs
3. **Quarterly Load Tests**: Validate performance targets
4. **Annual Architecture Review**: Identify optimization opportunities

---

## Support

For performance-related issues:
- **Slack:** #performance-ops
- **On-call:** PagerDuty escalation
- **Runbooks:** `/docs/runbooks/performance/`
