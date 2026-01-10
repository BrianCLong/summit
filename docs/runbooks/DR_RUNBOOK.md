# Disaster Recovery Runbook

**Severity:** CRITICAL
**Trigger:** Loss of service in a primary region (`us-east-1`).

## Overview

This document outlines the procedures for recovering the Summit platform in the event of a disaster.

## Backup Strategy

### PostgreSQL

- **Frequency**: Daily at 2 AM UTC
- **Retention**: 30 days
- **Type**: Logical dump (`pg_dump`)
- **Storage**: Local filesystem + S3 Bucket (`s3://<bucket>/postgres/`)
- **Verification**: Automatic restore test during DR drills

### Neo4j

- **Frequency**: Daily at 2 AM UTC
- **Retention**: 30 days
- **Type**: Logical export (JSONL)
- **Storage**: Local filesystem + S3 Bucket (`s3://<bucket>/neo4j/`)
- **Verification**: Integrity check of JSONL structure

### Redis

- **Frequency**: Continuous (AOF) + Daily Snapshots (BGSAVE)
- **Storage**: Local filesystem + S3 Bucket (`s3://<bucket>/redis/`)

## 1. Assessment

- **Verify Outage:** Check CloudWatch Dashboards and Route53 Health Checks.
- **Confirm Scope:** Is it a single service or region-wide?
- **Decision:** If outage is expected to last > 10 minutes, initiate FAILOVER.

## 2. Failover Procedure (Automated)

_The system is designed to failover automatically via Route53. However, manual steps may be required for the Database._

### A. Database Failover (Aurora Global)

1. **Check Replication Status:**
   ```bash
   aws rds describe-global-clusters --global-cluster-identifier summit-global-db
   ```
2. **Promote Secondary Region:**
   ```bash
   aws rds failover-global-cluster \
     --global-cluster-identifier summit-global-db \
     --target-db-cluster-identifier summit-secondary
   ```
3. **Verify Promotion:** Wait for status to change from `failing-over` to `available`.

### B. Redis Failover

1. **Promote Secondary Replication Group:**
   ```bash
   aws elasticache modify-replication-group \
     --replication-group-id summit-redis-secondary \
     --automatic-failover-enabled \
     --multi-az-enabled \
     --apply-immediately
   ```

### C. Traffic Redirection

1. **Verify DNS:** Ensure Route53 is not returning `us-east-1` IPs.
   ```bash
   dig api.summit.intelgraph.io +short
   ```

## 3. Restoration Procedures

### Database Restoration (PostgreSQL)

1. **Identify Backup**:
   ```bash
   ls -l /backups/postgres/
   ```
2. **Restore**:

   ```bash
   # Stop application services
   make down

   # Restore
   gzip -cd /backups/postgres/<date>/postgres-backup.sql.gz | psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
   ```

3. **Verify**:
   Check row counts and integrity.

### Graph Restoration (Neo4j)

1. **Identify Backup**:
   ```bash
   ls -l /backups/neo4j/
   ```
2. **Restore**:
   Use the `import_graph.ts` script or Cypher LOAD CSV.

   _Emergency Import Script:_

   ```typescript
   // Use server/scripts/restore_graph.ts
   npm run script:restore-graph -- --file /backups/neo4j/<date>/export.jsonl.gz
   ```

## 4. Post-Failover Verification

- **Run Smoke Tests:** Execute `scripts/smoke-test.cjs` against the new primary region.
- **Check Latency:** Monitor `us-west-2` latency metrics.

## 5. Failback (Recovery)

_Once `us-east-1` is stable:_

1. **Sync Data:** Ensure the original primary is caught up as a replica.
2. **Scheduled Maintenance:** Announce a maintenance window.
3. **Failover Back:** Repeat the promotion process targeting `summit-primary`.

## Disaster Recovery Drills

DR Drills should be run weekly using the automated service.

```bash
# Trigger manual drill
curl -X POST http://localhost:3000/api/dr/drill
```

Status can be checked at: `/api/dr/status`

## Contacts

- **DevOps On-Call**: devops@example.com
- **DBA**: dba@example.com
