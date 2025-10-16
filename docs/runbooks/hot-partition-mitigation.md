# 🔥 Hot Partition Mitigation Runbook

**Severity:** High
**MTTR Target:** < 20 minutes
**Escalation:** Database specialist required

## 🔍 Symptoms

- Database query timeouts on specific tables
- Uneven CPU/memory usage across database nodes
- Specific tenant experiencing degraded performance
- Lock contention alerts in database monitoring

## ⚡ Immediate Assessment (0-5 minutes)

### 1. Identify Hot Partition

```bash
# PostgreSQL hot partition detection
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_ops,
    n_tup_hot_upd,
    seq_scan,
    seq_tup_read
FROM pg_stat_user_tables
ORDER BY total_ops DESC
LIMIT 10;"
```

```bash
# Neo4j hot node detection
kubectl exec -n intelgraph-prod deployment/neo4j -- cypher-shell "
CALL db.stats.retrieve('GRAPH COUNTS') YIELD data
RETURN data.nodes, data.relationships, data.properties
ORDER BY data.nodes DESC;"
```

### 2. Check Resource Utilization

```bash
# Database CPU/Memory per pod
kubectl top pods -n intelgraph-prod -l app=postgres --containers
kubectl top pods -n intelgraph-prod -l app=neo4j --containers

# Query performance metrics
curl -s "http://prometheus.intelgraph-prod.svc.cluster.local:9090/api/v1/query?query=rate(postgres_query_duration_seconds_sum[5m])"
```

### 3. Identify Tenant/Query Patterns

```bash
# Check application logs for slow queries
kubectl logs -n intelgraph-prod deployment/intelgraph --tail=100 | grep -i "slow\|timeout\|deadlock"

# PostgreSQL active queries
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
```

## 🔧 Mitigation Strategies

### PostgreSQL Hot Partition

#### 1. Query Optimization (5-10 minutes)

```bash
# Terminate long-running queries
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes'
AND state = 'active';"

# Update table statistics
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
ANALYZE entities;
ANALYZE relationships;
ANALYZE investigations;"
```

#### 2. Connection Pool Management

```bash
# Check connection pool status
kubectl exec -n intelgraph-prod deployment/intelgraph -- curl -s http://localhost:3000/admin/db-pool-status

# Reset connection pools to clear stuck connections
kubectl exec -n intelgraph-prod deployment/intelgraph -- curl -X POST http://localhost:3000/admin/reset-db-pools
```

#### 3. Temporary Query Limits

```bash
# Apply temporary query timeouts
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SET statement_timeout = '30s';
SET lock_timeout = '10s';"
```

### Neo4j Hot Node

#### 1. Cypher Query Optimization

```bash
# Kill expensive queries
kubectl exec -n intelgraph-prod deployment/neo4j -- cypher-shell "
CALL dbms.listQueries() YIELD query, queryId, elapsedTimeMillis
WHERE elapsedTimeMillis > 30000
CALL dbms.killQuery(queryId) YIELD queryId as killed
RETURN killed;"
```

#### 2. Cache Management

```bash
# Clear query cache for problematic queries
kubectl exec -n intelgraph-prod deployment/neo4j -- cypher-shell "
CALL db.clearQueryCaches();"

# Warm up commonly used indexes
kubectl exec -n intelgraph-prod deployment/neo4j -- cypher-shell "
CALL db.index.fulltext.awaitEventuallyConsistentIndexRefresh();"
```

### Application-Level Mitigation (10-15 minutes)

#### 1. Circuit Breaker Activation

```bash
# Enable circuit breakers for expensive operations
kubectl exec -n intelgraph-prod deployment/intelgraph -- curl -X POST \
    http://localhost:3000/admin/circuit-breaker \
    -d '{"operation": "complex-graph-queries", "enabled": true, "threshold": 10}'
```

#### 2. Rate Limiting

```bash
# Apply temporary rate limiting to affected endpoints
kubectl patch deployment intelgraph -n intelgraph-prod --patch='
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "intelgraph",
          "env": [
            {"name": "RATE_LIMIT_ENABLED", "value": "true"},
            {"name": "RATE_LIMIT_MAX_REQUESTS", "value": "100"},
            {"name": "RATE_LIMIT_WINDOW_MS", "value": "60000"}
          ]
        }]
      }
    }
  }
}'
```

#### 3. Query Result Caching

```bash
# Enable aggressive caching for read operations
kubectl exec -n intelgraph-prod deployment/redis -- redis-cli CONFIG SET maxmemory-policy allkeys-lru
kubectl exec -n intelgraph-prod deployment/intelgraph -- curl -X POST \
    http://localhost:3000/admin/cache-config \
    -d '{"ttl": 600, "enabled": true, "aggressive": true}'
```

## 🔄 Scaling Response (15-20 minutes)

### Database Scaling

```bash
# Scale PostgreSQL read replicas
kubectl scale deployment postgres-replica --replicas=3 -n intelgraph-prod

# Scale Neo4j cluster (if clustered)
kubectl scale statefulset neo4j --replicas=5 -n intelgraph-prod
```

### Application Scaling

```bash
# Scale application pods to distribute load
kubectl scale deployment intelgraph --replicas=12 -n intelgraph-prod

# Wait for new pods to be ready
kubectl wait --for=condition=available --timeout=300s deployment/intelgraph -n intelgraph-prod
```

## 📊 Monitoring & Verification

```bash
# Check partition activity has normalized
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Verify query performance improved
curl -s "http://prometheus.intelgraph-prod.svc.cluster.local:9090/api/v1/query?query=histogram_quantile(0.95, rate(postgres_query_duration_seconds_bucket[5m]))"

# Monitor for sustained improvement
watch -n 30 'kubectl top pods -n intelgraph-prod -l app=postgres'
```

## 🚨 Escalation Triggers

- **10 minutes:** No improvement → Engage database specialist
- **15 minutes:** Performance degrading → Consider read-only mode
- **20 minutes:** System unstable → Activate hot standby

## 🔍 Common Hot Partition Causes

1. **Tenant Data Skew** → Implement tenant-aware partitioning
2. **Time-Series Data** → Partition by time ranges
3. **Popular Entity Access** → Implement entity-level caching
4. **Missing Indexes** → Add selective indexes for hot queries
5. **Lock Contention** → Optimize transaction boundaries

## 📈 Long-Term Prevention

### PostgreSQL Partitioning

```sql
-- Implement time-based partitioning for events table
CREATE TABLE events_2025_09 PARTITION OF events
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Tenant-based partitioning for entities
CREATE TABLE entities_tenant_1 PARTITION OF entities
FOR VALUES IN ('tenant-1');
```

### Neo4j Optimization

```cypher
// Create composite indexes for common query patterns
CREATE INDEX entity_type_created FOR (e:Entity) ON (e.type, e.createdAt);
CREATE INDEX relationship_strength FOR ()-[r:RELATED_TO]-() ON (r.strength);
```

### Monitoring Enhancements

```bash
# Set up partition-specific alerting
kubectl apply -f monitoring/alerts/hot-partition-alerts.yml

# Enable query performance tracking
kubectl patch configmap intelgraph-config -n intelgraph-prod --patch='
{
  "data": {
    "LOG_SLOW_QUERIES": "true",
    "SLOW_QUERY_THRESHOLD_MS": "1000"
  }
}'
```

**Runbook Owner:** Database Team
**Last Updated:** September 23, 2025
