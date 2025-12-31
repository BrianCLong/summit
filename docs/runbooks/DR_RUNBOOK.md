# Disaster Recovery Runbook

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

## Restoration Procedures

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
   Use the `import_graph.ts` script (to be implemented) or Cypher LOAD CSV.

   *Emergency Import Script:*
   ```typescript
   // Use server/scripts/restore_graph.ts
   npm run script:restore-graph -- --file /backups/neo4j/<date>/export.jsonl.gz
   ```

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
