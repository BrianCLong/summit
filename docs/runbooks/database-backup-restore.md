# Database Backup & Restore Runbook

> **Last Updated**: 2025-12-06
> **Owner**: Platform Engineering Team
> **Classification**: Operations Documentation

This runbook provides comprehensive backup and restore procedures for Summit/IntelGraph's core datastores, including disaster recovery guidance.

---

## Table of Contents

1. [Overview](#overview)
2. [Datastores Covered](#datastores-covered)
3. [Recovery Objectives](#recovery-objectives)
4. [Backup Procedures](#backup-procedures)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Safety Guidelines](#safety-guidelines)
8. [Troubleshooting](#troubleshooting)
9. [Related Documentation](#related-documentation)

---

## Overview

Summit/IntelGraph uses a multi-database architecture to support its intelligence analysis platform. This runbook covers the backup and restore procedures for all critical datastores.

### Critical State Components

| Component | Technology | Purpose | Criticality |
|-----------|------------|---------|-------------|
| **Relational Data** | PostgreSQL 16 | Users, investigations, metadata, audit logs | **Critical** |
| **Graph Data** | Neo4j 5.x | Entities, relationships, intelligence graph | **Critical** |
| **Cache/Queue** | Redis 7 | Sessions, rate limiting, pub/sub | **Important** (Ephemeral) |
| **Time-Series** | TimescaleDB | Analytics events, temporal patterns | **Important** |
| **Search** | Elasticsearch | Full-text search indexes | **Recoverable** (Re-indexable) |

### Backup Storage Locations

| Environment | Storage | Encryption | Retention |
|-------------|---------|------------|-----------|
| Development | Local `./backups/` | None | Manual cleanup |
| Staging | S3: `summit-staging-backups` | AES256 | 14 days |
| Production | S3: `summit-prod-backups` | KMS | 30 days (90 days GLACIER) |

---

## Datastores Covered

### PostgreSQL (Primary Relational Database)

- **Host**: `localhost:5432` (dev), RDS Aurora (prod)
- **Database**: `summit_dev` / `summit_prod`
- **User**: `summit` / `intelgraph`
- **Key Tables**: `users`, `investigations`, `entities`, `runs`, `tasks`, `audit_logs`

**Backup Methods**:
- `pg_dump` for logical backups (dev/staging)
- WAL-G PITR for continuous archival (production)
- RDS automated snapshots (production)

### Neo4j (Graph Database)

- **Host**: `bolt://localhost:7687` (dev), Managed instance (prod)
- **Database**: `neo4j`
- **Key Data**: Entity nodes, relationship edges, graph properties

**Backup Methods**:
- `neo4j-admin database dump` (Community Edition - offline)
- `neo4j-admin backup` (Enterprise Edition - online)
- APOC export for selective data

**Important**: Neo4j Community Edition requires the database to be stopped for backup. Enterprise Edition supports online backup.

### Redis (Cache/Queue)

- **Host**: `localhost:6379` (dev), ElastiCache (prod)
- **Database**: DB 0 (cache), DB 1 (sessions)
- **Key Data**: Sessions, rate limits, temporary queues

**Backup Methods**:
- RDB snapshots (`BGSAVE`)
- AOF (Append-Only File) for durability

**Note**: Redis is considered ephemeral for DR purposes. Applications should handle cache misses gracefully.

---

## Recovery Objectives

### By Environment

| Environment | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|-------------|--------------------------------|-------------------------------|
| **Production** | 5 minutes (WAL archiving) | 4 hours |
| **Staging** | 1 hour | 8 hours |
| **Development** | Manual backup interval | 30 minutes |

### By Datastore

| Datastore | RPO Target | RTO Target | Backup Frequency |
|-----------|------------|------------|------------------|
| PostgreSQL | 5 min (prod), 1 hour (staging) | 1 hour | Continuous WAL + Daily full |
| Neo4j | 1 hour | 2 hours | Hourly |
| Redis | N/A (ephemeral) | 15 minutes | Hourly RDB snapshot |
| TimescaleDB | 1 hour | 2 hours | Daily |

---

## Backup Procedures

### Quick Reference

```bash
# Development: Full backup (all datastores)
./scripts/db/backup.sh --env=dev --datastores=all

# Development: PostgreSQL only
./scripts/db/backup.sh --env=dev --datastores=postgres

# Staging: Full backup to S3
./scripts/db/backup.sh --env=staging --datastores=all --upload-s3

# Dry run (see what would happen)
./scripts/db/backup.sh --env=dev --datastores=all --dry-run
```

### PostgreSQL Backup

#### Development (Docker)

```bash
# Using the unified script
./scripts/db/backup.sh --env=dev --datastores=postgres

# Manual pg_dump
docker exec postgres pg_dump -U summit -d summit_dev -Fc -f /tmp/backup.dump
docker cp postgres:/tmp/backup.dump ./backups/postgres-$(date +%Y%m%d_%H%M%S).dump
```

#### Staging/Production (pg_dump to S3)

```bash
# Set environment
export PGHOST=your-rds-host.rds.amazonaws.com
export PGUSER=summit
export PGPASSWORD=$(aws secretsmanager get-secret-value --secret-id summit/db/password --query SecretString --output text)
export PGDATABASE=summit_prod
export BACKUP_BUCKET=summit-prod-backups

# Execute backup
./scripts/backups/postgres_backup.sh
```

#### Production (WAL-G PITR)

WAL-G continuously archives PostgreSQL WAL segments to S3:

```bash
# Check WAL archiving status
kubectl exec -n summit postgres-0 -- wal-g wal-verify

# Force a WAL segment switch
kubectl exec -n summit postgres-0 -- psql -c "SELECT pg_switch_wal();"

# List available backups
kubectl exec -n summit postgres-0 -- wal-g backup-list
```

### Neo4j Backup

#### Development (Docker - Offline Dump)

```bash
# Using the unified script
./scripts/db/backup.sh --env=dev --datastores=neo4j

# Manual backup (requires stopping Neo4j)
docker stop neo4j
docker run --rm \
    -v neo4j_data:/data \
    -v $(pwd)/backups:/backup \
    neo4j:5.8 \
    neo4j-admin database dump neo4j --to-path=/backup
docker start neo4j
```

#### Production (Kubernetes CronJob)

The backup is handled by a CronJob defined in `k8s/neo4j/cron-backup.yaml`:

```bash
# Trigger manual backup
kubectl create job neo4j-backup-manual --from=cronjob/neo4j-backup -n summit

# Check backup status
kubectl logs -n summit job/neo4j-backup-manual
```

### Redis Backup

#### Development

```bash
# Using the unified script
./scripts/db/backup.sh --env=dev --datastores=redis

# Manual snapshot
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d_%H%M%S).rdb
```

#### Production (ElastiCache)

Redis is ephemeral, but snapshots can be taken via AWS:

```bash
# Create manual snapshot
aws elasticache create-snapshot \
    --replication-group-id summit-redis \
    --snapshot-name summit-redis-$(date +%Y%m%d_%H%M%S)
```

### Full System Backup

For complete system backup including all datastores, configs, and uploads:

```bash
# Development
./scripts/db/backup.sh --env=dev --datastores=all

# With S3 upload (staging/prod)
./scripts/db/backup.sh --env=staging --datastores=all --upload-s3

# Enhanced backup with specific set
./scripts/backup-enhanced.sh --set=disaster_recovery
```

---

## Restore Procedures

### Quick Reference

```bash
# Development: Restore from backup
./scripts/db/restore.sh --env=dev --backup-path=./backups/summit-backup-20251206_120000

# Staging: Restore from S3
./scripts/db/restore.sh --env=staging --backup-id=summit-backup-20251206_120000

# Dry run (see what would happen)
./scripts/db/restore.sh --env=dev --backup-path=./backups/backup-dir --dry-run
```

### Safety Checklist Before Restore

Before proceeding with any restore operation:

- [ ] Confirm the backup file exists and is valid (check checksums)
- [ ] Verify you are restoring to the CORRECT environment
- [ ] Take a fresh backup of current state (if possible)
- [ ] Notify stakeholders of potential downtime
- [ ] For production: Follow change management process
- [ ] For production: Have rollback plan ready

### PostgreSQL Restore

#### Development (Docker)

```bash
# Using the unified script
./scripts/db/restore.sh --env=dev --datastores=postgres --backup-path=./backups/backup-dir

# Manual restore
# Step 1: Drop and recreate database
docker exec postgres dropdb -U summit --if-exists summit_dev
docker exec postgres createdb -U summit summit_dev

# Step 2: Restore from dump
cat ./backups/postgres.dump | docker exec -i postgres pg_restore -U summit -d summit_dev --clean --if-exists
```

#### Production (RDS PITR)

```bash
# Restore to a point in time
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier summit-prod \
    --target-db-instance-identifier summit-prod-restored \
    --restore-to-time "2025-12-06T10:00:00Z"
```

See `docs/runbooks/dr/pitr_restore_rds.md` for detailed RDS PITR procedures.

### Neo4j Restore

#### Development (Docker)

```bash
# Using the unified script
./scripts/db/restore.sh --env=dev --datastores=neo4j --backup-path=./backups/backup-dir

# Manual restore (requires stopping Neo4j)
docker stop neo4j
docker run --rm \
    -v neo4j_data:/data \
    -v $(pwd)/backups:/backup \
    neo4j:5.8 \
    neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true
docker start neo4j
```

#### Production (Kubernetes)

```bash
# Scale down Neo4j
kubectl scale statefulset neo4j --replicas=0 -n summit

# Restore from S3
kubectl run neo4j-restore --rm -it --image=neo4j:5.8 \
    --overrides='{...}' \
    -- neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true

# Scale up Neo4j
kubectl scale statefulset neo4j --replicas=1 -n summit
```

### Redis Restore

#### Development

```bash
# Using the unified script
./scripts/db/restore.sh --env=dev --datastores=redis --backup-path=./backups/backup-dir

# Manual restore
docker stop redis
docker cp ./backups/redis.rdb redis:/data/dump.rdb
docker start redis
```

### Post-Restore Verification

After any restore operation:

1. **Check service health**:
   ```bash
   # All services
   docker ps
   curl http://localhost:4000/health

   # PostgreSQL
   docker exec postgres pg_isready -U summit -d summit_dev

   # Neo4j
   docker exec neo4j cypher-shell -u neo4j -p devpassword "RETURN 1"

   # Redis
   docker exec redis redis-cli PING
   ```

2. **Verify data integrity**:
   ```bash
   # PostgreSQL - check tables exist
   docker exec postgres psql -U summit -d summit_dev -c "\dt"

   # Neo4j - check node count
   docker exec neo4j cypher-shell -u neo4j -p devpassword "MATCH (n) RETURN count(n)"

   # Redis - check key count
   docker exec redis redis-cli DBSIZE
   ```

3. **Run smoke tests**:
   ```bash
   make smoke
   ```

---

## Disaster Recovery

### DR Scenarios

#### Scenario 1: Single Database Corruption

**Symptoms**: Application errors, data inconsistencies, query failures
**Response Time**: 1-2 hours

1. Identify affected database and extent of corruption
2. Stop writes to affected database (if possible)
3. Restore from latest clean backup
4. Verify data integrity
5. Resume operations

#### Scenario 2: Complete Environment Loss

**Symptoms**: All services down, infrastructure failure
**Response Time**: 4-8 hours

1. Activate DR environment (if available)
2. Restore all databases from latest backups
3. Update DNS/load balancer to point to DR environment
4. Verify all services are operational
5. Notify stakeholders

#### Scenario 3: Data Corruption Across Multiple Days

**Symptoms**: Gradual data corruption, discovered late
**Response Time**: 8-24 hours

1. Identify corruption timeline
2. Use PITR to restore to point before corruption
3. Replay legitimate transactions if possible
4. Implement data reconciliation

### DR Drill Schedule

| Drill Type | Frequency | Duration | Scope |
|------------|-----------|----------|-------|
| Backup Validation | Weekly (CI/CD) | 30 min | Automated |
| Single DB Restore | Monthly | 2 hours | One datastore |
| Full DR Simulation | Quarterly | 4 hours | All datastores |
| Multi-Region Failover | Semi-annually | 8 hours | Cross-region |

### DR Drill Procedure

```bash
# 1. Create a test namespace/environment
kubectl create namespace summit-dr-drill

# 2. Restore from production backup to test environment
./scripts/db/restore.sh --env=dr-drill --backup-id=summit-prod-latest

# 3. Verify application functionality
kubectl port-forward -n summit-dr-drill svc/api 4000:4000
curl http://localhost:4000/health

# 4. Run verification tests
pnpm test:smoke --env=dr-drill

# 5. Clean up drill environment
kubectl delete namespace summit-dr-drill
```

---

## Safety Guidelines

### DO NOT EVER

- **NEVER** restore production data to a shared development environment without sanitization
- **NEVER** run backup scripts with production credentials on development machines
- **NEVER** store backup encryption keys in the same location as backups
- **NEVER** skip verification after restore operations
- **NEVER** delete old backups before confirming new backups are valid

### Environment Protection

The backup/restore scripts include built-in safeguards:

```bash
# Scripts will REFUSE to run against production without explicit flags
./scripts/db/backup.sh --env=production  # Requires additional --confirm-production flag

# Production restore requires multiple confirmations
./scripts/db/restore.sh --env=production  # Will prompt for confirmation and require typed confirmation
```

### Data Sanitization for Non-Production Restore

When restoring production data to non-production environments:

1. **Required sanitization**:
   - User emails masked to `dev_<id>@example.com`
   - Passwords reset to development defaults
   - API keys replaced with `dev_test_key_<name>`
   - PII fields redacted

2. **Use sanitization flag**:
   ```bash
   ./scripts/db/restore.sh --env=staging --backup-id=prod-backup --sanitize
   ```

### Credential Management

| Environment | Credential Source | Notes |
|-------------|------------------|-------|
| Development | `.env` file | Default passwords acceptable |
| Staging | AWS Secrets Manager | Rotated monthly |
| Production | AWS Secrets Manager + KMS | Rotated weekly, encrypted at rest |

---

## Troubleshooting

### Common Issues

#### Backup fails with "permission denied"

```bash
# Docker volume permissions
docker exec postgres chmod -R 777 /tmp

# Host directory permissions
chmod -R 755 ./backups
```

#### Neo4j backup fails with "database in use"

```bash
# For Community Edition, must stop database
docker stop neo4j
# Then run backup
# Then restart
docker start neo4j
```

#### PostgreSQL restore fails with "database in use"

```bash
# Terminate existing connections
docker exec postgres psql -U summit -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'summit_dev' AND pid <> pg_backend_pid();"
```

#### S3 upload times out

```bash
# Use multipart upload for large files
aws s3 cp ./backup.tar.gz s3://bucket/path/ --expected-size=$(stat -f%z ./backup.tar.gz)
```

#### Backup verification fails

```bash
# Check checksum
sha256sum -c ./backups/CHECKSUMS

# Verify PostgreSQL dump integrity
pg_restore --list ./backups/postgres.dump

# Verify Neo4j dump integrity
neo4j-admin database info ./backups/neo4j.dump
```

### Health Check Commands

```bash
# PostgreSQL
docker exec postgres pg_isready -U summit -d summit_dev
psql $DATABASE_URL -c "SELECT 1;"

# Neo4j
curl -u neo4j:devpassword http://localhost:7474/db/neo4j/tx
docker exec neo4j cypher-shell -u neo4j -p devpassword "RETURN 1;"

# Redis
docker exec redis redis-cli PING
redis-cli -h localhost -p 6379 INFO server
```

---

## Related Documentation

- [runbooks/DR.md](../../runbooks/DR.md) - Quick DR reference
- [docs/runbooks/backup_runbook.md](./backup_runbook.md) - Legacy backup procedures
- [docs/runbooks/restore_runbook.md](./restore_runbook.md) - Legacy restore procedures
- [docs/runbooks/dr/pitr_restore_rds.md](./dr/pitr_restore_rds.md) - RDS PITR procedures
- [docs/runbooks/database-failure-recovery.md](./database-failure-recovery.md) - Database failure recovery
- [scripts/backup-enhanced.sh](../../scripts/backup-enhanced.sh) - Enhanced backup script
- [scripts/db/backup.sh](../../scripts/db/backup.sh) - Unified backup script
- [scripts/db/restore.sh](../../scripts/db/restore.sh) - Unified restore script

---

## Version History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-12-06 | 1.0 | Platform Engineering | Initial creation |

---

## Appendix: Environment Variables

### Required for Backup Scripts

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=summit_dev
POSTGRES_USER=summit
POSTGRES_PASSWORD=devpassword

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=devpassword

# S3 (for cloud backup)
BACKUP_BUCKET=summit-backups
AWS_REGION=us-east-1

# Encryption
BACKUP_ENCRYPTION_KEY=  # Optional, for encrypting backups
```

### Environment-Specific Overrides

```bash
# Production overrides (loaded from Secrets Manager)
POSTGRES_HOST=$(aws secretsmanager get-secret-value --secret-id summit/prod/db/host)
POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --secret-id summit/prod/db/password)
```
