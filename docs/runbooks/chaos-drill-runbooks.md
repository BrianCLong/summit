# Chaos Engineering Incident Runbooks

## Overview

This document provides step-by-step runbooks for handling incidents that may occur during chaos engineering experiments or in production.

**Acceptance Criteria:**
- **P95 query latency**: < 1.5s on benchmark
- **RTO** (Recovery Time Objective): ≤ 1 hour
- **RPO** (Recovery Point Objective): ≤ 5 minutes
- **Monthly chaos drills**: Must pass all experiments

---

## Table of Contents

1. [Pod Kill - API Server](#1-pod-kill---api-server)
2. [Pod Kill - PostgreSQL Database](#2-pod-kill---postgresql-database)
3. [Pod Kill - Neo4j Graph Database](#3-pod-kill---neo4j-graph-database)
4. [Network Partition - API to Database](#4-network-partition---api-to-database)
5. [Redis Broker Failure](#5-redis-broker-failure)
6. [High Query Latency](#6-high-query-latency)
7. [Disk I/O Failure](#7-disk-io-failure)
8. [Memory/CPU Stress](#8-memorycpu-stress)

---

## 1. Pod Kill - API Server

### Scenario
One or more API server pods are killed unexpectedly.

### Detection
- **Alert**: Pod restart count increasing
- **Symptom**: Increased 5xx errors, client connection failures
- **Metrics**: `kube_pod_container_status_restarts_total{pod=~"intelgraph-server.*"}`

### Impact
- **Severity**: Medium
- **User Impact**: Brief service interruption for users connected to killed pod
- **Expected Recovery**: < 30 seconds (Kubernetes automatic restart)

### Response Steps

#### Immediate (0-5 minutes)

1. **Verify pod status**:
   ```bash
   kubectl get pods -l app=intelgraph-server -n default
   kubectl describe pod <pod-name>
   ```

2. **Check pod logs**:
   ```bash
   kubectl logs <pod-name> --previous
   kubectl logs <pod-name> --tail=100
   ```

3. **Verify replacement pod is healthy**:
   ```bash
   kubectl get pods -l app=intelgraph-server -w
   ```

4. **Check service endpoints**:
   ```bash
   kubectl get endpoints intelgraph-server
   ```

#### Short-term (5-15 minutes)

5. **Verify traffic routing**:
   ```bash
   curl -f http://intelgraph-server:4000/health
   ```

6. **Check error rates in Prometheus**:
   ```promql
   rate(intelgraph_http_request_duration_seconds_count{status=~"5.."}[5m])
   ```

7. **Verify database connections are restored**:
   ```promql
   intelgraph_db_connection_pool_usage{database="postgres"}
   ```

#### Long-term (15-60 minutes)

8. **Review HPA status** (if autoscaling is enabled):
   ```bash
   kubectl get hpa intelgraph-server
   ```

9. **Analyze root cause**:
   - Check node health: `kubectl top nodes`
   - Review events: `kubectl get events --sort-by='.lastTimestamp' | head -20`
   - Check for OOMKilled: `kubectl get pods -o json | jq '.items[] | select(.status.containerStatuses[].lastState.terminated.reason=="OOMKilled")'`

10. **Document in incident log**

### Success Criteria
- ✅ All pods in `Running` state
- ✅ Health endpoint returns 200 OK
- ✅ P95 latency < 1.5s
- ✅ Error rate < 1%
- ✅ RTO achieved: < 30s

### Rollback Procedure
If new pods fail to start:
```bash
kubectl rollout undo deployment/intelgraph-server
kubectl rollout status deployment/intelgraph-server
```

---

## 2. Pod Kill - PostgreSQL Database

### Scenario
PostgreSQL primary pod is killed or becomes unavailable.

### Detection
- **Alert**: PostgreSQL pod down, connection failures
- **Symptom**: Database query errors, connection timeouts
- **Metrics**: `up{job="postgres-exporter"} == 0`

### Impact
- **Severity**: Critical
- **User Impact**: All database operations fail
- **Expected Recovery**: < 2 minutes (if using HA setup), < 10 minutes (if single instance)

### Response Steps

#### Immediate (0-5 minutes)

1. **Verify PostgreSQL pod status**:
   ```bash
   kubectl get pods -l app=postgres -n default
   kubectl describe pod postgres-0
   ```

2. **Check StatefulSet health**:
   ```bash
   kubectl get statefulset postgres
   ```

3. **Verify PVC (Persistent Volume Claim)**:
   ```bash
   kubectl get pvc -l app=postgres
   ```

4. **If using RDS, check AWS console or CLI**:
   ```bash
   aws rds describe-db-instances --db-instance-identifier intelgraph-prod
   ```

#### Short-term (5-15 minutes)

5. **Wait for automatic recovery or trigger manual restart**:
   ```bash
   kubectl rollout restart statefulset/postgres
   ```

6. **Verify database is accepting connections**:
   ```bash
   kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT 1;"
   ```

7. **Check replication lag** (if using replica):
   ```bash
   kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT pg_last_wal_replay_lsn();"
   ```

8. **Monitor connection pool recovery**:
   ```promql
   intelgraph_db_connection_pool_usage{database="postgres"}
   ```

#### Long-term (15-60 minutes)

9. **Verify data integrity**:
   ```bash
   kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT COUNT(*) FROM entities;"
   ```

10. **Check for any corrupted tables**:
    ```sql
    SELECT * FROM pg_stat_database WHERE datname = 'intelgraph';
    ```

11. **If failover to DR region is needed**, see [DR Failover Runbook](#dr-failover)

12. **Document RPO/RTO achieved**

### Success Criteria
- ✅ PostgreSQL pod in `Running` state
- ✅ Database accepting connections
- ✅ Replication lag < 5s (if applicable)
- ✅ Zero data loss (verify with checksum)
- ✅ RTO achieved: < 10 minutes
- ✅ RPO achieved: < 5 minutes

### Rollback Procedure
If new pod fails to mount PVC or has data corruption:
```bash
# Restore from latest backup
./scripts/restore-postgres.sh --timestamp latest --target postgres-0
```

---

## 3. Pod Kill - Neo4j Graph Database

### Scenario
Neo4j pod is killed or becomes unavailable.

### Detection
- **Alert**: Neo4j pod down, Cypher query failures
- **Symptom**: Graph operations fail, relationship queries timeout
- **Metrics**: `neo4j_database_status{status="offline"}`

### Response Steps

#### Immediate (0-5 minutes)

1. **Verify Neo4j pod status**:
   ```bash
   kubectl get pods -l app=neo4j
   kubectl logs neo4j-0 --tail=50
   ```

2. **Check if cluster mode is active** (if using causal cluster):
   ```bash
   kubectl exec -it neo4j-0 -- cypher-shell "CALL dbms.cluster.overview();"
   ```

3. **Verify data volume**:
   ```bash
   kubectl get pvc -l app=neo4j
   ```

#### Short-term (5-15 minutes)

4. **Wait for pod to restart or trigger manual restart**:
   ```bash
   kubectl rollout restart statefulset/neo4j
   ```

5. **Verify Neo4j is accepting connections**:
   ```bash
   kubectl exec -it neo4j-0 -- cypher-shell "RETURN 1;"
   ```

6. **Check database consistency**:
   ```cypher
   CALL dbms.listConfig() YIELD name, value 
   WHERE name = 'dbms.recovery.state' 
   RETURN name, value;
   ```

7. **Monitor query latency**:
   ```promql
   histogram_quantile(0.95, rate(intelgraph_query_latency_seconds_bucket{database="neo4j"}[5m]))
   ```

### Success Criteria
- ✅ Neo4j pod in `Running` state
- ✅ Cypher queries executing successfully
- ✅ P95 graph query latency < 2s
- ✅ RTO achieved: < 2 minutes

---

## 4. Network Partition - API to Database

### Scenario
Network partition between API server and database(s).

### Detection
- **Alert**: High database connection timeout rate
- **Symptom**: Queries hang, connection pool exhausted
- **Metrics**: `intelgraph_db_connection_wait_seconds > 5`

### Response Steps

#### Immediate (0-5 minutes)

1. **Verify network connectivity**:
   ```bash
   kubectl exec -it <api-pod> -- ping postgres
   kubectl exec -it <api-pod> -- nc -zv postgres 5432
   ```

2. **Check Network Policies**:
   ```bash
   kubectl get networkpolicies -n default
   kubectl describe networkpolicy <policy-name>
   ```

3. **Verify DNS resolution**:
   ```bash
   kubectl exec -it <api-pod> -- nslookup postgres
   ```

#### Short-term (5-15 minutes)

4. **Check kube-proxy logs**:
   ```bash
   kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=100
   ```

5. **Verify service endpoints**:
   ```bash
   kubectl get endpoints postgres
   ```

6. **If partition persists, trigger failover to read replica** (if available):
   ```bash
   # Update connection string to point to replica
   kubectl set env deployment/intelgraph-server DB_HOST=postgres-replica
   ```

### Success Criteria
- ✅ Network connectivity restored
- ✅ Database connections < 5s wait time
- ✅ Error rate < 1%
- ✅ RTO achieved: < 15 minutes

---

## 5. Redis Broker Failure

### Scenario
Redis broker (used for queues and caching) fails.

### Detection
- **Alert**: Redis connection errors, job queue stalled
- **Symptom**: Background jobs not processing, cache misses
- **Metrics**: `redis_up == 0`

### Response Steps

#### Immediate (0-5 minutes)

1. **Verify Redis pod status**:
   ```bash
   kubectl get pods -l app=redis
   kubectl logs redis-0
   ```

2. **Check Redis cluster health** (if using cluster mode):
   ```bash
   kubectl exec -it redis-0 -- redis-cli cluster info
   ```

3. **Verify persistence status**:
   ```bash
   kubectl exec -it redis-0 -- redis-cli INFO persistence
   ```

#### Short-term (5-15 minutes)

4. **Restart Redis if needed**:
   ```bash
   kubectl rollout restart statefulset/redis
   ```

5. **Verify job queues are processing**:
   ```bash
   kubectl exec -it redis-0 -- redis-cli LLEN bull:queue:default
   ```

6. **Monitor cache hit rate**:
   ```promql
   rate(redis_keyspace_hits_total[5m]) / 
   (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
   ```

### Success Criteria
- ✅ Redis accepting connections
- ✅ Job queues processing
- ✅ Cache hit rate > 80%
- ✅ RTO achieved: < 5 minutes

---

## 6. High Query Latency

### Scenario
Query latency exceeds acceptable thresholds (P95 > 1.5s).

### Detection
- **Alert**: `intelgraph_query_latency_seconds > 1.5`
- **Symptom**: Slow page loads, timeout errors
- **Metrics**: P95, P99 latency elevated

### Response Steps

#### Immediate (0-5 minutes)

1. **Check slow query killer is active**:
   ```bash
   curl http://localhost:4000/api/observability/slow-queries
   ```

2. **Identify slow queries in PostgreSQL**:
   ```sql
   SELECT pid, usename, state, query, 
          EXTRACT(EPOCH FROM (now() - query_start)) as duration
   FROM pg_stat_activity
   WHERE state = 'active'
     AND EXTRACT(EPOCH FROM (now() - query_start)) > 2
   ORDER BY duration DESC;
   ```

3. **Check database connection pool saturation**:
   ```promql
   intelgraph_db_connection_pool_usage / intelgraph_db_connection_pool_size > 0.9
   ```

#### Short-term (5-15 minutes)

4. **Kill slow queries manually if killer is not working**:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'active'
     AND EXTRACT(EPOCH FROM (now() - query_start)) > 10;
   ```

5. **Check for missing indexes**:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   ORDER BY idx_scan ASC
   LIMIT 10;
   ```

6. **Verify autoscaling is working**:
   ```bash
   kubectl get hpa
   kubectl describe hpa intelgraph-server
   ```

#### Long-term (15-60 minutes)

7. **Scale up resources if needed**:
   ```bash
   kubectl scale deployment intelgraph-server --replicas=5
   ```

8. **Analyze query patterns and optimize**:
   - Review explain plans for top slow queries
   - Add indexes where needed
   - Implement query result caching

9. **Consider moving to read replicas for read-heavy queries**

### Success Criteria
- ✅ P95 latency < 1.5s
- ✅ P99 latency < 3s
- ✅ No queries running > 5s
- ✅ Connection pool usage < 80%

---

## 7. Disk I/O Failure

### Scenario
Disk I/O errors or high latency on database volumes.

### Response Steps

#### Immediate (0-5 minutes)

1. **Check disk health**:
   ```bash
   kubectl exec -it postgres-0 -- df -h
   kubectl exec -it postgres-0 -- iostat -x 1 5
   ```

2. **Verify PVC status**:
   ```bash
   kubectl get pvc
   kubectl describe pvc postgres-data
   ```

3. **Check node disk health**:
   ```bash
   kubectl top nodes
   ```

#### Short-term (5-15 minutes)

4. **If using cloud provider, check volume health**:
   ```bash
   aws ec2 describe-volumes --volume-ids <volume-id>
   ```

5. **Consider failing over to DR region if disk is failing**

### Success Criteria
- ✅ Disk I/O latency < 10ms
- ✅ No disk errors in logs
- ✅ RTO achieved: < 30 minutes

---

## 8. Memory/CPU Stress

### Scenario
High memory or CPU usage causing performance degradation.

### Response Steps

#### Immediate (0-5 minutes)

1. **Check resource usage**:
   ```bash
   kubectl top pods
   kubectl top nodes
   ```

2. **Identify resource-hungry processes**:
   ```bash
   kubectl exec -it <pod> -- top
   ```

#### Short-term (5-15 minutes)

3. **Scale horizontally if HPA is not responding fast enough**:
   ```bash
   kubectl scale deployment intelgraph-server --replicas=10
   ```

4. **Check for memory leaks**:
   ```promql
   rate(nodejs_heap_size_used_bytes[5m]) > 0.8 * nodejs_heap_size_total_bytes
   ```

5. **Restart pods if necessary**:
   ```bash
   kubectl rollout restart deployment/intelgraph-server
   ```

### Success Criteria
- ✅ CPU usage < 80%
- ✅ Memory usage < 85%
- ✅ No OOMKilled pods

---

## DR Failover

### When to Trigger DR Failover

Trigger failover to DR region if:
- Primary region is unavailable for > 15 minutes
- Data corruption detected in primary
- Network partition isolating primary region
- Compliance requirement (e.g., regional disaster)

### DR Failover Steps

1. **Activate DR runbook**:
   ```bash
   ./scripts/dr-failover.sh --region us-west-2 --dry-run=false
   ```

2. **Update DNS to point to DR region**:
   ```bash
   aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://failover-dns.json
   ```

3. **Promote read replica to primary**:
   ```bash
   aws rds promote-read-replica --db-instance-identifier intelgraph-dr
   ```

4. **Verify DR region is healthy**

5. **Communicate to stakeholders**

### DR Failover RTO Target
- **RTO**: ≤ 1 hour
- **RPO**: ≤ 5 minutes

---

## Post-Incident Review

After any incident (chaos drill or production):

1. **Calculate actual RTO/RPO achieved**
2. **Document lessons learned**
3. **Update runbooks if needed**
4. **Create action items for improvements**
5. **Schedule blameless postmortem within 72 hours**

---

## Monitoring & Alerts

### Key Metrics to Monitor

```promql
# P95 Query Latency (target: < 1.5s)
histogram_quantile(0.95, rate(intelgraph_query_latency_seconds_bucket[5m]))

# Error Rate (target: < 1%)
rate(intelgraph_query_errors_total[5m]) / rate(intelgraph_query_latency_seconds_count[5m])

# Connection Pool Saturation (target: < 80%)
intelgraph_db_connection_pool_usage / intelgraph_db_connection_pool_size

# Replication Lag (target: < 5s)
intelgraph_dr_replication_lag_seconds < 5

# Actual RPO/RTO
intelgraph_dr_rpo_actual_seconds <= 300
intelgraph_dr_rto_actual_seconds <= 3600
```

---

## Contact Information

- **On-Call Engineer**: PagerDuty rotation
- **Database Team**: #db-ops Slack channel
- **DevOps Team**: #devops Slack channel
- **Security Team**: #security Slack channel

