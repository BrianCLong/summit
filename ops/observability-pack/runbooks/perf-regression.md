# Performance Regression Runbook

## Overview
This runbook covers investigation and remediation of performance regressions in IntelGraph services.

## Symptoms
- P99 latency exceeds SLO targets
- Increased error rates
- User complaints about slow responses
- SLO burn rate alerts firing

## Investigation Steps

### 1. Identify Affected Services
```bash
# Check which services are affected
kubectl top pods -n intelgraph --sort-by=cpu

# Check latency metrics
curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.99,sum(rate(http_request_duration_seconds_bucket[5m]))by(le,service))" | jq
```

### 2. Check Recent Deployments
```bash
# List recent deployments
kubectl rollout history deployment -n intelgraph

# Check if regression correlates with deployment
kubectl describe deployment <service-name> -n intelgraph | grep -A5 "Events"
```

### 3. Analyze Query Patterns
```sql
-- Check slow queries in PostgreSQL
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;
```

```cypher
// Check slow queries in Neo4j
CALL dbms.listQueries()
YIELD queryId, username, query, elapsedTimeMillis
WHERE elapsedTimeMillis > 5000
RETURN queryId, username, query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC
```

### 4. Check Resource Utilization
```bash
# Memory usage
kubectl top pods -n intelgraph --sort-by=memory

# Check for OOM kills
kubectl get events -n intelgraph --field-selector reason=OOMKilled

# Check disk I/O
kubectl exec -it <pod> -- iostat -x 1 5
```

### 5. Review Logs
```bash
# Get error logs
kubectl logs -n intelgraph deployment/<service> --since=1h | grep -i error

# Check for timeout patterns
kubectl logs -n intelgraph deployment/<service> --since=1h | grep -i timeout
```

## Remediation Steps

### Immediate Actions

1. **Rollback if deployment-related**
   ```bash
   kubectl rollout undo deployment/<service-name> -n intelgraph
   ```

2. **Scale up if resource constrained**
   ```bash
   kubectl scale deployment/<service-name> --replicas=<new-count> -n intelgraph
   ```

3. **Kill runaway queries**
   ```sql
   -- PostgreSQL
   SELECT pg_terminate_backend(<pid>);
   ```
   ```cypher
   // Neo4j
   CALL dbms.killQuery('<queryId>')
   ```

4. **Enable rate limiting**
   ```bash
   # Apply rate limit config
   kubectl apply -f k8s/rate-limit-config.yaml
   ```

### Investigation Actions

1. **Profile the service**
   - Enable profiling endpoint
   - Collect CPU/memory profiles
   - Analyze hot paths

2. **Check database indexes**
   ```sql
   -- Missing indexes
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE indexname IS NULL;
   ```

3. **Review query plans**
   ```sql
   EXPLAIN ANALYZE <slow-query>;
   ```

## Escalation Path

1. **L1**: On-call engineer - Initial triage (15 min)
2. **L2**: Service owner - Deep investigation (30 min)
3. **L3**: Platform team - Infrastructure issues (1 hour)
4. **L4**: Architecture team - Design changes needed

## Post-Incident

- [ ] Document root cause
- [ ] Create follow-up tickets for permanent fixes
- [ ] Update monitoring/alerting if gaps found
- [ ] Schedule blameless postmortem
