# Database Failure Recovery Runbook

## Overview

This runbook covers recovery procedures for PostgreSQL and Neo4j database failures.

## PostgreSQL Failure Recovery

### Symptoms
- API returning 500 errors
- Health check showing "postgres: unhealthy"
- Connection timeout errors
- "FATAL: remaining connection slots are reserved" errors

### Quick Diagnosis

```bash
# Check PostgreSQL pod status
kubectl get pods -l app=postgres -n intelgraph

# Check PostgreSQL logs
kubectl logs -l app=postgres -n intelgraph --tail=200

# Test connection from API pod
kubectl exec -it deployment/intelgraph-api -n intelgraph -- \
  psql -h postgres -U $POSTGRES_USER -d intelgraph -c "SELECT 1;"

# Check connection count
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

### Recovery Procedures

#### Scenario 1: Connection Pool Exhaustion

**Immediate Mitigation:**
```bash
# Kill idle connections
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'intelgraph'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
"

# Kill long-running queries (>5 minutes)
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'active'
  AND now() - pg_stat_activity.query_start > interval '5 minutes';
"
```

**Long-term Fix:**
```bash
# Increase max_connections in postgres config
kubectl edit configmap postgres-config -n intelgraph
# Update: max_connections = 300

# Restart PostgreSQL
kubectl rollout restart statefulset postgres -n intelgraph

# Update connection pool size in API
kubectl set env deployment/intelgraph-api -n intelgraph \
  POSTGRES_POOL_SIZE=50 \
  POSTGRES_MAX_CONNECTIONS=200
```

#### Scenario 2: Database Crash/Corruption

**Check Status:**
```bash
# Check PostgreSQL pod events
kubectl describe pod -l app=postgres -n intelgraph

# Check for corruption in logs
kubectl logs -l app=postgres -n intelgraph | grep -i "corrupt\|panic\|fatal"

# Check disk space
kubectl exec -it statefulset/postgres -n intelgraph -- df -h
```

**Recovery Steps:**
```bash
# 1. Stop writes to database (enable read-only mode)
kubectl scale deployment intelgraph-api -n intelgraph --replicas=0
kubectl scale deployment intelgraph-worker -n intelgraph --replicas=0

# 2. Create backup before recovery
kubectl exec -it statefulset/postgres -n intelgraph -- \
  pg_dump -U $POSTGRES_USER -d intelgraph -F c -f /tmp/emergency_backup.dump

# Copy backup locally
kubectl cp intelgraph/postgres-0:/tmp/emergency_backup.dump ./emergency_backup.dump

# 3. Attempt automatic recovery
kubectl exec -it statefulset/postgres -n intelgraph -- \
  pg_ctl restart -D /var/lib/postgresql/data

# 4. If corruption detected, restore from backup
# Get latest backup
aws s3 ls s3://intelgraph-backups/database/ | tail -1

# Download backup
aws s3 cp s3://intelgraph-backups/database/postgres_backup_YYYYMMDD.dump ./

# Restore
kubectl exec -i statefulset/postgres -n intelgraph -- \
  pg_restore -U $POSTGRES_USER -d intelgraph -F c -c < ./postgres_backup_YYYYMMDD.dump

# 5. Verify data integrity
kubectl exec -it statefulset/postgres -n intelgraph -- \
  psql -U $POSTGRES_USER -d intelgraph -c "
    SELECT count(*) FROM entities;
    SELECT count(*) FROM relationships;
    SELECT count(*) FROM investigations;
  "

# 6. Restart services
kubectl scale deployment intelgraph-api -n intelgraph --replicas=3
kubectl scale deployment intelgraph-worker -n intelgraph --replicas=5

# 7. Monitor for stability
watch kubectl get pods -n intelgraph
```

#### Scenario 3: Replication Lag

**Check Replication Status:**
```bash
# Check replication lag
psql -h postgres-primary -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    sync_state,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes
  FROM pg_stat_replication;
"

# Check replica health
kubectl exec -it statefulset/postgres-replica-0 -n intelgraph -- \
  psql -U $POSTGRES_USER -c "SELECT pg_is_in_recovery();"
```

**Mitigation:**
```bash
# Temporary: Route all reads to primary
kubectl patch service postgres-replica -n intelgraph -p '
{
  "spec": {
    "selector": {
      "app": "postgres-primary"
    }
  }
}
'

# Long-term: Rebuild replica
kubectl delete pod postgres-replica-0 -n intelgraph
# Wait for rebuild and catch-up
```

## Neo4j Failure Recovery

### Symptoms
- Graph queries timing out
- "Unable to connect to Neo4j" errors
- Cypher query failures
- Neo4j browser inaccessible

### Quick Diagnosis

```bash
# Check Neo4j pod status
kubectl get pods -l app=neo4j -n intelgraph

# Check Neo4j logs
kubectl logs -l app=neo4j -n intelgraph --tail=200

# Test connection
cypher-shell -a bolt://neo4j:7687 -u neo4j -p $NEO4J_PASSWORD \
  "RETURN 1 as test;"

# Check cluster status (if clustered)
cypher-shell -a bolt://neo4j:7687 -u neo4j -p $NEO4J_PASSWORD \
  "CALL dbms.cluster.overview() YIELD * RETURN *;"
```

### Recovery Procedures

#### Scenario 1: Neo4j Pod Crash

**Immediate Recovery:**
```bash
# Check crash reason
kubectl describe pod -l app=neo4j -n intelgraph | grep -A 20 "Last State"

# Check memory/CPU limits
kubectl get pod -l app=neo4j -n intelgraph -o yaml | grep -A 5 resources

# Restart Neo4j
kubectl delete pod -l app=neo4j -n intelgraph

# Wait for restart
kubectl wait --for=condition=ready pod -l app=neo4j -n intelgraph --timeout=300s

# Verify health
cypher-shell -a bolt://neo4j:7687 -u neo4j -p $NEO4J_PASSWORD \
  "CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Store file sizes') YIELD attributes RETURN attributes['TotalStoreSize'] as storeSize;"
```

#### Scenario 2: Data Corruption

**Check for Corruption:**
```bash
# Check consistency
kubectl exec -it statefulset/neo4j-0 -n intelgraph -- \
  neo4j-admin check-consistency --database=neo4j --verbose

# Check store info
kubectl exec -it statefulset/neo4j-0 -n intelgraph -- \
  neo4j-admin store-info --database=neo4j
```

**Recovery from Backup:**
```bash
# 1. Stop Neo4j
kubectl scale statefulset neo4j -n intelgraph --replicas=0

# 2. Download latest backup
aws s3 ls s3://intelgraph-backups/neo4j/ | tail -1
aws s3 cp s3://intelgraph-backups/neo4j/neo4j_backup_YYYYMMDD.tar.gz ./

# 3. Restore backup
kubectl exec -it statefulset/neo4j-0 -n intelgraph -- bash
# Inside pod:
cd /data
rm -rf databases/neo4j/*
tar -xzf /tmp/neo4j_backup_YYYYMMDD.tar.gz -C /data/databases/neo4j/

# 4. Restart Neo4j
kubectl scale statefulset neo4j -n intelgraph --replicas=1

# 5. Verify data
cypher-shell -a bolt://neo4j:7687 -u neo4j -p $NEO4J_PASSWORD \
  "MATCH (n) RETURN count(n) as nodeCount;"
```

#### Scenario 3: Performance Degradation

**Identify Slow Queries:**
```cypher
// List slow queries
CALL dbms.listQueries()
YIELD queryId, query, elapsedTimeMillis, allocatedBytes
WHERE elapsedTimeMillis > 1000
RETURN queryId, query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC
LIMIT 10;

// Kill slow query
CALL dbms.killQuery('<query-id>');
```

**Check and Rebuild Indexes:**
```cypher
// Check index status
SHOW INDEXES
YIELD name, type, entityType, properties, state
WHERE state <> "ONLINE"
RETURN *;

// Rebuild problematic index
DROP INDEX index_name IF EXISTS;
CREATE INDEX index_name FOR (n:Entity) ON (n.property);

// Wait for index to come online
SHOW INDEXES
YIELD name, state, populationPercent
WHERE name = 'index_name'
RETURN name, state, populationPercent;
```

**Optimize Memory:**
```bash
# Update Neo4j memory settings
kubectl edit configmap neo4j-config -n intelgraph

# Increase heap and page cache:
# dbms.memory.heap.initial_size=4G
# dbms.memory.heap.max_size=8G
# dbms.memory.pagecache.size=8G

# Restart Neo4j
kubectl rollout restart statefulset neo4j -n intelgraph
```

## Point-in-Time Recovery (PITR)

### PostgreSQL PITR

```bash
# 1. Identify recovery point
# Find transaction time from logs or monitoring

# 2. Stop current database
kubectl scale statefulset postgres -n intelgraph --replicas=0

# 3. Restore base backup
aws s3 cp s3://intelgraph-backups/database/base_backup_YYYYMMDD.tar.gz ./
kubectl exec -it statefulset/postgres-0 -n intelgraph -- bash
# Extract in pod

# 4. Create recovery.conf
cat > recovery.conf << EOF
restore_command = 'aws s3 cp s3://intelgraph-backups/wal/%f %p'
recovery_target_time = '2024-01-01 12:00:00'
recovery_target_action = 'promote'
EOF

# 5. Start PostgreSQL in recovery mode
kubectl scale statefulset postgres -n intelgraph --replicas=1

# 6. Monitor recovery
tail -f /var/log/postgresql/postgresql.log | grep recovery
```

### Neo4j PITR

```bash
# Neo4j backup/restore with transaction log replay
neo4j-admin restore \
  --from=/backup/neo4j_backup_YYYYMMDD \
  --database=neo4j \
  --force

# Apply transaction logs up to specific point
neo4j-admin replay \
  --from=/backup/transaction-logs \
  --to-tx=123456 \
  --database=neo4j
```

## Validation Checklist

After recovery, verify:

### PostgreSQL
- [ ] Connection successful
- [ ] Record counts match expectations
- [ ] Recent data visible
- [ ] Indexes functional
- [ ] Replication working (if applicable)
- [ ] Performance normal

### Neo4j
- [ ] Connection successful
- [ ] Node/relationship counts correct
- [ ] Indexes online
- [ ] Recent data visible
- [ ] Query performance normal
- [ ] Cluster health good (if clustered)

## Communication Template

```
🚨 DATABASE INCIDENT: <PostgreSQL/Neo4j> Failure

Severity: P0
Status: <Investigating/Recovering/Resolved>
Impact: <description>
Started: <timestamp>

Current Status:
- Database: <UP/DOWN/DEGRADED>
- Data Loss: <NONE/MINIMAL/TBD>
- ETA: <timestamp>

We are working to restore service. Updates every 10 minutes.
```

## Post-Recovery Steps

1. **Document the incident**
   - Root cause
   - Recovery time
   - Data loss (if any)

2. **Schedule post-mortem**
   - Within 48 hours
   - Include database team

3. **Action items**
   - Improve monitoring
   - Update backup procedures
   - Increase resource limits
   - Update runbooks

4. **Test backups**
   - Verify backup integrity
   - Test restore procedures
   - Update backup schedule if needed

## Prevention

- Run daily backup verification tests
- Monitor disk space and growth trends
- Set up proactive alerts for:
  - Disk space <30%
  - Connection pool >80%
  - Replication lag >5 seconds
  - Long-running queries
- Regular database health checks
- Maintain up-to-date runbooks
- Practice recovery procedures quarterly
