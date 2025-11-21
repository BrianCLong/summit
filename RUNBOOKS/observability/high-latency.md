# High Latency Troubleshooting Runbook

**Service**: All Summit services
**Alert**: `APILatencySLOBurn`, `GatewayLatencySLOBurn`
**Severity**: Warning/Critical
**SLO Impact**: Latency SLO violation

## Overview

This runbook guides you through troubleshooting high latency alerts. High latency can impact user experience and burn through your error budget even if requests aren't failing.

## Symptoms

- **Grafana Alert**: "API P99 latency exceeds SLO" or similar
- **User Impact**: Slow page loads, delayed API responses
- **Metrics**: P95/P99 latency above SLO threshold

## Initial Assessment (2 minutes)

### 1. Confirm the Issue

**Dashboard**: [Summit - Golden Signals](http://localhost:3001/d/summit-golden-signals)

Check:
- [ ] Current P95/P99 latency values
- [ ] Latency trend over last 1h, 6h, 24h
- [ ] Which services are affected (API, Gateway, both)

### 2. Check Error Rate

High latency often correlates with errors:

```promql
# Error rate
sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

If error rate is also high, follow the [Error Rate Spike](./error-rate-spike.md) runbook first.

### 3. Identify Affected Endpoints

**Jaeger UI**: [http://localhost:16686](http://localhost:16686)

- Search for traces with duration > SLO threshold
- Group by operation name
- Identify which endpoints are slow

## Investigation (10 minutes)

### 4. Database Queries

**Most common cause**: Slow database queries

#### Neo4j Query Analysis

```bash
# Access Neo4j Browser
open http://localhost:7474

# Find slow queries (replace threshold with your SLO)
CALL dbms.listQueries() YIELD query, elapsedTimeMillis, status
WHERE elapsedTimeMillis > 1000
RETURN query, elapsedTimeMillis, status
ORDER BY elapsedTimeMillis DESC
```

**Grafana Dashboard**: Neo4j Performance (if exists)

Check:
- [ ] Query duration P99
- [ ] Transaction throughput
- [ ] Heap usage

#### PostgreSQL Query Analysis

```bash
# Connect to PostgreSQL
docker exec -it summit-postgres psql -U summit -d summit_dev

# Find slow queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
ORDER BY duration DESC;

# Check connection pool usage
SELECT count(*) as connections FROM pg_stat_activity;
```

### 5. Trace Analysis

**Jaeger**: Find a slow trace

Steps:
1. Go to [Jaeger UI](http://localhost:16686)
2. Select service: `summit-api`
3. Set Min Duration: `500ms` (or your threshold)
4. Click "Find Traces"
5. Click on a slow trace

**Look for**:
- [ ] Which span is slowest?
- [ ] Is it a database call?
- [ ] Is it an external API call?
- [ ] Is it CPU-bound processing?

### 6. Resource Utilization

**Prometheus Queries**:

```promql
# CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])
```

Check:
- [ ] Is CPU > 80%?
- [ ] Is memory > 85%?
- [ ] Is disk I/O saturated?

### 7. Network Latency

**Check service-to-service latency**:

```bash
# From API container to Neo4j
docker exec summit-api ping -c 5 neo4j

# From API container to PostgreSQL
docker exec summit-api ping -c 5 postgres

# From Gateway to API
docker exec summit-gateway ping -c 5 api
```

Expected: < 1ms for internal Docker network

## Common Causes & Fixes

### Cause 1: Unoptimized Database Queries

**Symptom**: Specific Cypher or SQL queries taking > 1s

**Fix**:
```cypher
// Neo4j: Add missing indexes
CREATE INDEX entity_name_idx FOR (e:Entity) ON (e.name);
CREATE INDEX relationship_type_idx FOR ()-[r:RELATES_TO]-() ON (r.type);
```

```sql
-- PostgreSQL: Add missing indexes
CREATE INDEX idx_entities_created_at ON entities(created_at);
CREATE INDEX idx_investigations_status ON investigations(status);
```

### Cause 2: N+1 Query Problem

**Symptom**: Many small database queries instead of one larger query

**Fix**: Use GraphQL DataLoader or batch queries

**Trace evidence**: Many sequential database spans

### Cause 3: Memory Pressure / GC Pauses

**Symptom**: Periodic latency spikes every few minutes

**Fix**:
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in docker-compose.yml
environment:
  NODE_OPTIONS: "--max-old-space-size=4096"
```

### Cause 4: Connection Pool Exhaustion

**Symptom**: Latency spikes when traffic increases

**Fix**:
```typescript
// Increase connection pool size
const pool = new Pool({
  max: 50, // Increase from default 10
  idleTimeoutMillis: 30000,
});
```

### Cause 5: External API Calls

**Symptom**: Trace shows long span for external HTTP call

**Fix**:
- Add timeouts
- Implement circuit breakers
- Cache responses
- Make calls asynchronous (background job)

**Example**:
```typescript
// Add timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000), // 5s timeout
});
```

## Mitigation (Immediate Actions)

If latency is causing user impact:

### 1. Scale Horizontally

```bash
# Scale API service
docker-compose up -d --scale api=3

# Or in Kubernetes
kubectl scale deployment summit-api --replicas=5
```

### 2. Reduce Load

```bash
# Temporarily reduce rate limits
# In .env or ConfigMap
RATE_LIMIT_MAX=300  # Reduce from 600
```

### 3. Enable Caching

```typescript
// Redis caching for expensive operations
const cachedResult = await redis.get(cacheKey);
if (cachedResult) return JSON.parse(cachedResult);

const result = await expensiveOperation();
await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5min TTL
```

## Resolution Verification

After implementing fixes:

1. **Check metrics** (wait 5-10 minutes for new data):
```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service="api"}[5m])) by (le))
```

2. **Verify traces**: Check that recent traces are faster

3. **Monitor SLO dashboard**: Ensure error budget burn rate decreases

4. **User validation**: Check with users if experience has improved

## Escalation

Escalate if:
- [ ] Latency remains > 2x SLO after 30 minutes of investigation
- [ ] Root cause is unclear after investigation steps
- [ ] Mitigation actions don't improve latency

**Escalate to**: Platform Team Lead / On-call Engineer
**Slack**: #summit-incidents
**Incident Manager**: Follow [Incident Response Playbook](../incident-response.md)

## Post-Incident

After resolving:

1. **Create postmortem** using [template](../postmortem_template.md)
2. **Document root cause** and fix in this runbook if new
3. **Update dashboards** if gaps were found
4. **Create tasks** for long-term fixes (e.g., query optimization)
5. **Review SLO thresholds** if they need adjustment

## Reference

- **Grafana Dashboards**:
  - [Golden Signals](http://localhost:3001/d/summit-golden-signals)
  - [SLO Overview](http://localhost:3001/d/summit-slo-overview)
- **Jaeger UI**: [http://localhost:16686](http://localhost:16686)
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Logs**: [Loki/Grafana Explore](http://localhost:3001/explore)

## Related Runbooks

- [Error Rate Spike](./error-rate-spike.md)
- [High CPU Usage](./high-cpu.md)
- [Database Performance](./database-performance.md)
- [Memory Leak Investigation](./memory-leak.md)

---

**Last Updated**: 2025-11-20
**Owner**: Platform Team
