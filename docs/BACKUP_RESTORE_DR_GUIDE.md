# Summit Backup, Restore, and Disaster Recovery Framework

**Version**: 1.0
**Last Updated**: 2025-01-20
**Owner**: Platform Engineering Team

## Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Sets](#backup-sets)
4. [Backup Procedures](#backup-procedures)
5. [Restore Procedures](#restore-procedures)
6. [Data Sanitization](#data-sanitization)
7. [DR Drill Scenarios](#dr-drill-scenarios)
8. [Automated Validation](#automated-validation)
9. [Infrastructure Requirements](#infrastructure-requirements)
10. [Operational Procedures](#operational-procedures)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Summit's backup, restore, and disaster recovery (DR) framework provides comprehensive data protection and business continuity capabilities across all critical services and data stores.

### Core Components

- **Neo4j**: Graph database for entity relationships and knowledge graphs
- **PostgreSQL**: Relational database with pgvector extension for transactional data
- **TimescaleDB**: Time-series data extension on PostgreSQL for analytics and events
- **Redis**: Cache and session store
- **Configuration**: OPA policies, application configs, Kubernetes manifests
- **Secrets**: Encrypted credentials and API keys
- **Provenance Store**: Data lineage and attestations
- **Policy Store**: Policy definitions and compliance data
- **Catalog Store**: Data catalog and metadata registry

### Key Features

✅ **Multiple Backup Sets**: Full, minimal, per-tenant, per-project, config-only, and DR-specific backups
✅ **Data Sanitization**: Automatic PII masking and credential replacement for dev/test environments
✅ **Multi-Region Support**: Cross-region replication for disaster recovery
✅ **Automated Validation**: Daily CI/CD pipeline validates backup integrity and restore procedures
✅ **Chaos Integration**: DR drills integrated with chaos engineering framework
✅ **Encryption**: AES-256 encryption for secrets and sensitive data
✅ **Integrity Verification**: SHA-256 checksums for all backup files

---

## Recovery Objectives

### RTO (Recovery Time Objective)

**Target**: **4 hours**

The maximum acceptable downtime for Summit services. This represents the time from disaster declaration to full service restoration with validated functionality.

#### RTO Breakdown by Phase

| Phase | Duration | Activities |
|-------|----------|------------|
| Assessment & Preparation | 30 min | Damage assessment, backup identification, DR infrastructure verification |
| Infrastructure Recovery | 90 min | Database restoration, service deployment, network configuration |
| Service Validation | 60 min | Health checks, data integrity verification, smoke tests |
| DNS & Traffic Cutover | 30 min | DNS updates, SSL verification, traffic routing |
| Final Validation | 30 min | Golden path tests, demo stories, monitoring activation |

**Total**: 3.5 hours (30-minute buffer within 4-hour target)

### RPO (Recovery Point Objective)

**Target**: **15 minutes**

The maximum acceptable data loss measured in time. Summit maintains backup schedules that ensure no more than 15 minutes of data can be lost in any disaster scenario.

#### RPO Implementation

- **Continuous WAL Archiving**: PostgreSQL Write-Ahead Logs archived every 5 minutes
- **Incremental Backups**: Every 15 minutes for critical databases
- **Full Backups**: Daily at 2 AM UTC
- **DR Snapshots**: Every 6 hours with multi-region replication
- **Transaction Logs**: Real-time replication to DR region (for future implementation)

### RTO/RPO by Environment

| Environment | RTO | RPO | Backup Frequency | Retention |
|-------------|-----|-----|------------------|-----------|
| Production | 4 hours | 15 minutes | Hourly incremental, Daily full | 30 days |
| Staging | 8 hours | 1 hour | Daily | 14 days |
| DR Rehearsal | 4 hours | 15 minutes | Same as production | 60 days |
| Development | 24 hours | 4 hours | Daily | 7 days |
| Testing | 24 hours | 4 hours | On-demand | 7 days |

---

## Backup Sets

Summit supports multiple backup set configurations optimized for different use cases.

### 1. Full System Backup

**Use Case**: Complete disaster recovery, compliance, auditing
**Frequency**: Daily at 2 AM UTC
**Retention**: 30 days
**Storage**: Local + S3

**Components**:
- ✅ Neo4j full database (dump format)
- ✅ PostgreSQL full database (custom format)
- ✅ TimescaleDB hypertables (events, temporal_patterns, analytics_traces)
- ✅ Redis full snapshot
- ✅ Audit chain (complete integrity chains)
- ✅ Configuration files (docker-compose, .env, Justfile)
- ✅ Secrets (encrypted)
- ✅ Provenance store (complete lineage)
- ✅ Policy store (all policies and decisions)
- ✅ Catalog store (metadata registry)

**Estimated Size**: ~40 GB
**Estimated Duration**: 30 minutes

**Example**:
```bash
./scripts/backup-enhanced.sh --set=full
```

### 2. Minimal Core Backup

**Use Case**: Quick recovery testing, development snapshots
**Frequency**: Hourly
**Retention**: 7 days
**Storage**: Local only

**Components**:
- ✅ PostgreSQL core tables only (entities, investigations, users, runs, tasks, runbooks)
- ✅ Neo4j core entities and critical relationships
- ✅ Redis cache (excluding sessions and temporary data)

**Estimated Size**: ~3 GB
**Estimated Duration**: 5 minutes

**Example**:
```bash
./scripts/backup-enhanced.sh --set=minimal
```

### 3. Per-Tenant Backup

**Use Case**: Tenant data isolation, GDPR compliance, selective recovery
**Frequency**: Hourly
**Retention**: 14 days
**Storage**: Local + S3

**Components**:
- ✅ PostgreSQL tenant data (filtered by tenant_id)
- ✅ Neo4j tenant graph (filtered by tenant_id)
- ✅ Tenant-specific configuration
- ✅ Tenant audit logs

**Metadata Required**: `tenant_id`

**Estimated Size**: ~500 MB per tenant
**Estimated Duration**: 3 minutes per tenant

**Example**:
```bash
TENANT_ID=customer-acme ./scripts/backup-enhanced.sh --set=tenant
```

### 4. Per-Project Backup

**Use Case**: Project/investigation archival, compliance, data portability
**Frequency**: On-demand
**Retention**: 90 days
**Storage**: Local + S3

**Components**:
- ✅ PostgreSQL project data (investigation, runs, tasks, results)
- ✅ Neo4j project graph (investigation entities and relationships)
- ✅ Project artifacts (outputs, reports, attachments)
- ✅ Project provenance (lineage and attestations)

**Metadata Required**: `project_id` or `investigation_id`

**Estimated Size**: ~200 MB per project
**Estimated Duration**: 2 minutes per project

**Example**:
```bash
PROJECT_ID=investigation-2025-001 ./scripts/backup-enhanced.sh --set=project
```

### 5. Configuration Only

**Use Case**: Configuration management, policy versioning, quick config restore
**Frequency**: Every 4 hours or on configuration change
**Retention**: 90 days
**Storage**: Local + S3 + Git

**Components**:
- ✅ Configuration files (all docker-compose, .env files)
- ✅ Secrets (encrypted)
- ✅ OPA policies (security policies)
- ✅ Policy bundles (signed policy packages)
- ✅ Catalog definitions (YAML definitions)

**Estimated Size**: ~20 MB
**Estimated Duration**: 1 minute

**Example**:
```bash
./scripts/backup-enhanced.sh --set=config_only
```

### 6. Disaster Recovery Snapshot

**Use Case**: Multi-region DR, production failover, comprehensive recovery
**Frequency**: Every 6 hours
**Retention**: 60 days
**Storage**: S3 primary region + S3 DR region

**Components**:
- ✅ All components from Full System Backup
- ✅ Kubernetes configurations (ConfigMaps, Secrets, Services, Deployments)
- ✅ Infrastructure state (Terraform state files)
- ✅ Cross-region replication enabled
- ✅ Multi-region storage verification

**Estimated Size**: ~50 GB
**Estimated Duration**: 45 minutes

**Example**:
```bash
S3_BUCKET=summit-dr-backups ./scripts/backup-enhanced.sh --set=disaster_recovery
```

---

## Backup Procedures

### Manual Backup Creation

#### Prerequisites

- Docker and Docker Compose installed
- Services running (neo4j, postgres, redis)
- Sufficient disk space (at least 2x backup size)
- S3 credentials configured (for remote backups)

#### Step-by-Step: Full Backup

1. **Navigate to project root**:
   ```bash
   cd /path/to/summit
   ```

2. **Set environment variables** (optional):
   ```bash
   export BACKUP_BASE=./backups
   export S3_BUCKET=summit-backups-prod
   export ENCRYPTION_KEY=your-secure-key-here
   ```

3. **Execute backup**:
   ```bash
   ./scripts/backup-enhanced.sh --set=full
   ```

4. **Verify backup**:
   ```bash
   BACKUP_ID=$(ls -t backups/summit-backup-full-* | head -1 | xargs basename)
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --mode=verify-only
   ```

5. **Review backup metadata**:
   ```bash
   cat "backups/$BACKUP_ID/backup-metadata.json" | jq .
   ```

#### Step-by-Step: Tenant Backup

1. **Identify tenant ID**:
   ```bash
   docker exec postgres psql -U intelgraph -d intelgraph_dev \
     -c "SELECT DISTINCT tenant_id FROM entities;"
   ```

2. **Create tenant backup**:
   ```bash
   TENANT_ID=customer-acme ./scripts/backup-enhanced.sh --set=tenant
   ```

3. **Verify tenant backup**:
   ```bash
   BACKUP_ID=$(ls -t backups/summit-backup-tenant-customer-acme-* | head -1 | xargs basename)
   ls -lh "backups/$BACKUP_ID"
   ```

### Automated Backup Scheduling

#### Using Cron

Add to `/etc/crontab` or user crontab:

```cron
# Full backup daily at 2 AM
0 2 * * * cd /opt/summit && ./scripts/backup-enhanced.sh --set=full >> /var/log/summit-backup.log 2>&1

# Minimal backup hourly
0 * * * * cd /opt/summit && ./scripts/backup-enhanced.sh --set=minimal >> /var/log/summit-backup.log 2>&1

# DR snapshot every 6 hours
0 */6 * * * cd /opt/summit && S3_BUCKET=summit-dr-backups ./scripts/backup-enhanced.sh --set=disaster_recovery >> /var/log/summit-dr-backup.log 2>&1

# Config backup every 4 hours
0 */4 * * * cd /opt/summit && ./scripts/backup-enhanced.sh --set=config_only >> /var/log/summit-config-backup.log 2>&1
```

#### Using Kubernetes CronJobs

See `/home/user/summit/k8s/db/cron-backup.yaml` for PostgreSQL backups and `/home/user/summit/k8s/neo4j/cron-backup.yaml` for Neo4j backups.

Example:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: summit-full-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: summit/backup:latest
            command:
            - /bin/bash
            - -c
            - ./scripts/backup-enhanced.sh --set=full
            env:
            - name: S3_BUCKET
              value: summit-backups-prod
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: backup-secrets
                  key: encryption-key
```

---

## Restore Procedures

### Environment-Specific Restore

Summit's enhanced restore script supports different target environments with automatic data sanitization.

#### Restore Environments

| Environment | Sanitization | Data Reduction | Use Case |
|-------------|--------------|----------------|----------|
| `production` | ❌ No | None | Production disaster recovery |
| `staging` | ⚠️ Minimal | None | Pre-production testing |
| `dr_rehearsal` | ❌ No | None | DR drill validation |
| `dev` | ✅ Full | 10% | Development environments |
| `test` | ✅ Full | 20% | Automated testing |

### Step-by-Step: Production Restore

**CRITICAL**: This procedure stops all services and overwrites data. Only use during actual disasters.

1. **Verify backup availability**:
   ```bash
   ls -lh backups/summit-backup-disaster_recovery-*
   ```

2. **Identify target backup**:
   ```bash
   BACKUP_ID=summit-backup-disaster_recovery-20250120T020000Z
   ```

3. **Verify backup integrity**:
   ```bash
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --mode=verify-only
   ```

4. **Execute restore** (with approval):
   ```bash
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=production --mode=full
   ```

5. **Verify restoration**:
   ```bash
   # Check databases
   docker exec postgres psql -U intelgraph -d intelgraph_dev -c "SELECT COUNT(*) FROM entities;"
   docker exec neo4j cypher-shell -u neo4j -p local_dev_pw "MATCH (n) RETURN COUNT(n);"
   docker exec redis redis-cli ping
   ```

6. **Run health checks**:
   ```bash
   curl -f http://localhost:4000/health
   ```

7. **Execute golden path tests**:
   ```bash
   pnpm test:golden-path
   ```

### Step-by-Step: Development Environment Restore

This automatically sanitizes data for safe development use.

1. **Select recent backup**:
   ```bash
   BACKUP_ID=$(ls -t backups/summit-backup-full-* | head -1 | xargs basename)
   echo "Using backup: $BACKUP_ID"
   ```

2. **Restore with sanitization**:
   ```bash
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=dev
   ```

3. **Verify sanitization**:
   ```bash
   # Check for sanitized emails
   docker exec postgres psql -U intelgraph -d intelgraph_dev \
     -c "SELECT email FROM users LIMIT 5;"
   # Should show: dev_1@example.com, dev_2@example.com, etc.

   # Check for dev credentials
   docker exec postgres psql -U intelgraph -d intelgraph_dev \
     -c "SELECT name, value FROM configuration WHERE name LIKE '%_KEY' LIMIT 3;"
   # Should show: dev_test_key_*
   ```

### Step-by-Step: Selective Restore

Restore only specific components without affecting others.

1. **Set selective restore flags**:
   ```bash
   export RESTORE_POSTGRES=true
   export RESTORE_NEO4J=false
   export RESTORE_REDIS=false
   export RESTORE_CONFIG=false
   ```

2. **Execute selective restore**:
   ```bash
   BACKUP_ID=summit-backup-full-20250120T020000Z
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --mode=selective
   ```

### Dry Run Mode

Test restore procedures without making any changes:

```bash
BACKUP_ID=summit-backup-full-20250120T020000Z
./scripts/restore-enhanced.sh "$BACKUP_ID" --env=dev --dry-run
```

---

## Data Sanitization

For dev/test environments, Summit automatically sanitizes sensitive data to comply with security and privacy policies.

### Sanitization Rules

#### 1. PII (Personally Identifiable Information)

**Users Table**:
```sql
UPDATE users SET
    email = 'dev_' || id || '@example.com',
    phone = '+1-555-' || LPAD(id::text, 7, '0'),
    address = NULL
WHERE email NOT LIKE '%@example.com';
```

**Entities Table**:
```sql
UPDATE entities SET
    contact_email = 'entity_' || id || '@example.com',
    phone_number = '+1-555-' || LPAD(id::text, 7, '0')
WHERE contact_email IS NOT NULL;
```

#### 2. Sensitive Data

**Investigations**:
```sql
UPDATE investigations SET
    classified_info = '[REDACTED FOR DEV/TEST]',
    internal_notes = '[REDACTED FOR DEV/TEST]'
WHERE classified_info IS NOT NULL OR internal_notes IS NOT NULL;
```

**Audit Logs**:
```sql
UPDATE audit_logs SET
    user_ip = MD5(user_ip || 'dev_salt'),
    session_data = NULL
WHERE user_ip IS NOT NULL;
```

#### 3. Production Credentials

**Configuration**:
```sql
UPDATE configuration SET
    value = 'dev_test_key_' || name
WHERE name LIKE '%_KEY' OR name LIKE '%_SECRET' OR name LIKE '%_PASSWORD';
```

#### 4. Financial Data

**Billing**:
```sql
UPDATE billing SET
    credit_card = '****-****-****-0000',
    bank_account = '****0000'
WHERE credit_card IS NOT NULL OR bank_account IS NOT NULL;
```

### Neo4j Sanitization

```cypher
// Sanitize email addresses
MATCH (u:User)
WHERE u.email IS NOT NULL AND NOT u.email ENDS WITH '@example.com'
SET u.email = 'dev_' + id(u) + '@example.com';

// Sanitize phone numbers
MATCH (n)
WHERE n.phone IS NOT NULL
SET n.phone = '+1-555-' + substring(toString(id(n)), 0, 7);

// Redact classified properties
MATCH (n)
WHERE n.classified IS NOT NULL
SET n.classified = '[REDACTED FOR DEV/TEST]';

// Remove sensitive labels
MATCH (n:Classified)
REMOVE n:Classified
SET n:DevData;
```

### Data Reduction

For development and testing environments, data volumes are reduced to improve performance and reduce storage costs.

- **Dev Environment**: Retains 10% of non-critical data
- **Test Environment**: Retains 20% of non-critical data

**Affected Tables**:
- `audit_logs`: Keep last 30 days
- `analytics_traces`: Keep sample based on reduction factor
- `events`: Keep last 30 days

---

## DR Drill Scenarios

Summit includes comprehensive DR drill scenarios integrated with the chaos engineering framework.

### Scenario 1: Total Data Loss Recovery

**Objective**: Validate complete disaster recovery from catastrophic data loss
**Duration**: 2 hours
**Frequency**: Monthly

**Phases**:
1. Baseline Capture (15 min)
2. Disaster Simulation (5 min) - Destroys all data volumes
3. Recovery Initiation (10 min)
4. Full Restore (60 min)
5. Validation (30 min) - Golden path tests + demo stories
6. Cleanup (10 min)

**Success Criteria**:
- ✅ RTO < 4 hours
- ✅ Data integrity 100%
- ✅ Golden path tests 100% pass
- ✅ Demo stories 100% pass

**Execution**:
```bash
./RUNBOOKS/execute-dr-drill.sh scenario-1-total-data-loss
```

### Scenario 2: Database Corruption Recovery

**Objective**: Validate selective restore for database corruption
**Duration**: 1 hour
**Frequency**: Bi-weekly

**Phases**:
1. Corrupt Database (simulated)
2. Detect and Respond
3. Selective Restore (PostgreSQL only)
4. Validation

### Scenario 3: Multi-Region Failover

**Objective**: Test failover to DR region
**Duration**: 4 hours
**Frequency**: Quarterly

**Phases**:
1. Primary Region Failure (simulated)
2. DR Infrastructure Activation
3. Data Restore in DR Region
4. DNS Cutover
5. Application Validation
6. Monitoring and Documentation

### Scenario 4: Automated Backup Validation

**Objective**: Weekly validation of backup integrity
**Duration**: 30 minutes
**Frequency**: Weekly (automated via CI/CD)

**Phases**:
1. Select Recent Backup
2. Integrity Check (checksums)
3. Test Restore (dry run)
4. Sample Data Validation
5. Report Results

**Automated**: Runs via GitHub Actions every Sunday at 2 AM

### Scenario 5: Per-Tenant Data Recovery

**Objective**: Validate tenant-specific data restore
**Duration**: 45 minutes
**Frequency**: On-demand

**Phases**:
1. Backup Tenant Data
2. Simulate Tenant Data Loss
3. Restore Tenant Data
4. Validate Restoration (tenant isolation)

### Scenario 6: Chaos Engineering + DR Recovery

**Objective**: Combine chaos injection with recovery
**Duration**: 2 hours
**Frequency**: Monthly

**Chaos Experiments**:
- Network partition (postgres) - 5 min
- Service degradation (neo4j, 50%) - 10 min
- Data corruption (redis, 10%) - recovery via restore

---

## Automated Validation

### GitHub Actions Workflow

Summit includes a comprehensive CI/CD workflow for automated backup and restore validation.

**Workflow**: `.github/workflows/backup-restore-validation.yml`
**Schedule**: Daily at 3 AM UTC
**Manual Trigger**: Available via workflow_dispatch

#### Workflow Jobs

1. **create-backup**
   - Creates test data in PostgreSQL, Neo4j, Redis
   - Executes backup using specified backup set (minimal by default)
   - Verifies backup integrity via checksums
   - Uploads backup as artifact

2. **restore-validation**
   - Downloads backup artifact
   - Executes restore to specified environment (test by default)
   - Verifies database connectivity
   - Validates data sanitization (for dev/test environments)
   - Runs golden path tests (when available)
   - Generates validation report

3. **compliance-check**
   - Validates RTO/RPO compliance
   - Generates compliance summary

#### Running Manually

Via GitHub UI:
1. Navigate to Actions → Backup & Restore Validation
2. Click "Run workflow"
3. Select backup_set: `minimal`, `full`, or `config_only`
4. Select restore_env: `test` or `dev`
5. Click "Run workflow"

Via GitHub CLI:
```bash
gh workflow run backup-restore-validation.yml \
  -f backup_set=minimal \
  -f restore_env=test
```

### Monitoring Backup Success

**Prometheus Metrics**:
- `backup_success_total`: Counter of successful backups
- `backup_failure_total`: Counter of failed backups
- `backup_duration_seconds`: Histogram of backup duration
- `backup_size_bytes`: Gauge of backup size
- `restore_success_total`: Counter of successful restores
- `restore_duration_seconds`: Histogram of restore duration

**Grafana Dashboards**:
- `/home/user/summit/ops/observability/grafana/dashboards/backup-monitoring.json`

**Alerts**:
- Backup failure rate > 2% in 24h window
- Backup duration exceeds threshold (30 min for full, 5 min for minimal)
- Backup size growth > 50% unexpectedly
- No successful backup in last 24 hours
- Restore test failure

---

## Infrastructure Requirements

### Storage Requirements

| Backup Set | Size | Retention | Daily Increment | Monthly Total |
|------------|------|-----------|-----------------|---------------|
| Full | 40 GB | 30 days | 40 GB | 1.2 TB |
| Minimal | 3 GB | 7 days | 72 GB (hourly) | 630 GB |
| Tenant | 500 MB | 14 days | 12 GB (per tenant) | Variable |
| Config | 20 MB | 90 days | 120 MB | 5 GB |
| DR Snapshot | 50 GB | 60 days | 200 GB (4x daily) | 3 TB |

**Total Storage Estimate**: ~5 TB (with overhead and multi-region replication)

### S3 Bucket Configuration

#### Primary Region (us-west-2)

```bash
Bucket: summit-backups-prod
├── summit-backups/
│   ├── summit-backup-full-*/
│   ├── summit-backup-minimal-*/
│   └── summit-backup-config_only-*/
└── dr-backups/
    └── summit-backup-disaster_recovery-*/
```

**Lifecycle Policy**:
- Transition to STANDARD_IA after 30 days
- Transition to GLACIER after 90 days
- Delete after retention period + 30 days

#### DR Region (us-east-1)

```bash
Bucket: summit-backups-dr
├── dr-backups/
│   └── summit-backup-disaster_recovery-*/  (replicated from primary)
└── restore-tests/
    └── validation-*/
```

**Cross-Region Replication**: Enabled from primary to DR region for disaster_recovery backups

### Database Size Limits

- **PostgreSQL**: Up to 500 GB (adjust `pg_dump` parallelism for larger databases)
- **Neo4j**: Up to 200 GB (use `neo4j-admin dump` for large graphs)
- **TimescaleDB**: Up to 1 TB (use compression and retention policies)
- **Redis**: Up to 50 GB (RDB snapshots)

### Network Bandwidth

- **Backup to S3**: ~100 Mbps minimum for 4-hour RTO
- **Cross-Region Replication**: ~50 Mbps sustained
- **Restore from S3**: ~200 Mbps for fast recovery

---

## Operational Procedures

### Daily Operations

**Morning**:
1. ✅ Verify overnight backups completed successfully
   ```bash
   ls -lh backups/summit-backup-full-$(date +%Y%m%d)*
   ```

2. ✅ Check backup validation CI job results
   - Navigate to GitHub Actions → Backup & Restore Validation
   - Review latest run status

3. ✅ Monitor backup metrics in Grafana
   - Dashboard: "Backup & Restore Monitoring"
   - Check for alerts

**Weekly**:
1. ✅ Execute Scenario 4: Automated Backup Validation (automated)
2. ✅ Review backup storage usage
   ```bash
   du -sh backups/
   aws s3 ls s3://summit-backups-prod/ --recursive --human-readable --summarize
   ```

3. ✅ Test restore procedure (manual validation)
   ```bash
   BACKUP_ID=$(ls -t backups/summit-backup-full-* | head -1 | xargs basename)
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=test --dry-run
   ```

**Monthly**:
1. ✅ Execute Scenario 1: Total Data Loss DR Drill
2. ✅ Execute Scenario 6: Chaos Engineering + DR Recovery
3. ✅ Review and update DR documentation
4. ✅ Audit backup retention and cleanup
5. ✅ Review RTO/RPO compliance reports

**Quarterly**:
1. ✅ Execute Scenario 3: Multi-Region Failover Drill
2. ✅ Review and test DR runbook procedures
3. ✅ Update emergency contact information
4. ✅ Conduct tabletop DR exercises with team
5. ✅ Review infrastructure capacity for backups

### Incident Response

#### Backup Failure

**Detection**:
- Prometheus alert: `BackupFailed`
- Email notification to ops team
- Slack/webhook notification

**Response**:
1. Check backup logs:
   ```bash
   tail -f /var/log/summit-backup.log
   ```

2. Identify failure cause (disk space, database connection, S3 access, etc.)

3. Resolve issue and retry backup:
   ```bash
   ./scripts/backup-enhanced.sh --set=full
   ```

4. Document incident in post-mortem

#### Restore Failure

**Detection**:
- Manual restore command fails
- DR drill validation fails

**Response**:
1. Check restore logs and error messages

2. Verify backup integrity:
   ```bash
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --mode=verify-only
   ```

3. Try alternative backup:
   ```bash
   BACKUP_ID=$(ls -t backups/summit-backup-full-* | head -2 | tail -1 | xargs basename)
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=dr_rehearsal
   ```

4. Escalate to senior engineer if multiple backups fail

5. Document in incident report

#### Data Corruption Detected

**Detection**:
- Application errors
- Data integrity checks fail
- User reports

**Response**:
1. Immediately create backup of current state:
   ```bash
   ./scripts/backup-enhanced.sh --set=full
   ```

2. Identify scope of corruption (specific tables, time range)

3. Execute Scenario 2: Database Corruption Recovery

4. If corruption is widespread, execute Scenario 1: Total Data Loss Recovery

5. Post-incident: Review monitoring and add corruption detection

---

## Troubleshooting

### Common Issues

#### Issue: Backup script fails with "disk space" error

**Symptoms**:
```
❌ Backup failed
tar: Cannot write: No space left on device
```

**Resolution**:
1. Check disk space:
   ```bash
   df -h
   ```

2. Clean up old backups:
   ```bash
   # Remove backups older than 30 days
   find backups/ -name "summit-backup-*" -type d -mtime +30 -exec rm -rf {} \;
   ```

3. Adjust `RETENTION_DAYS`:
   ```bash
   RETENTION_DAYS=7 ./scripts/backup-enhanced.sh --set=full
   ```

4. Use S3 storage instead of local:
   ```bash
   S3_BUCKET=summit-backups-prod ./scripts/backup-enhanced.sh --set=full
   ```

#### Issue: Neo4j restore fails with "database already exists"

**Symptoms**:
```
❌ Neo4j restore failed
Error: database 'neo4j' already exists
```

**Resolution**:
1. Stop Neo4j:
   ```bash
   docker stop neo4j
   ```

2. Remove existing data volume:
   ```bash
   docker volume rm summit_neo4j_data
   docker volume create summit_neo4j_data
   ```

3. Retry restore:
   ```bash
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=production
   ```

#### Issue: PostgreSQL restore fails with "permission denied"

**Symptoms**:
```
❌ PostgreSQL restore failed
pg_restore: [archiver] could not open input file: Permission denied
```

**Resolution**:
1. Check file permissions:
   ```bash
   ls -lh backups/$BACKUP_ID/postgres-full.dump
   ```

2. Fix permissions:
   ```bash
   chmod 644 backups/$BACKUP_ID/postgres-full.dump
   ```

3. Retry restore

#### Issue: Restore validation fails in CI/CD

**Symptoms**:
- GitHub Actions job fails
- Restore validation report shows errors

**Resolution**:
1. Review job logs in GitHub Actions

2. Run locally to debug:
   ```bash
   BACKUP_ID=$(ls -t backups/summit-backup-minimal-* | head -1 | xargs basename)
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=test --dry-run
   ```

3. Check for environment-specific issues (missing services, network, etc.)

4. Fix issues and re-run workflow

#### Issue: Data sanitization not applied

**Symptoms**:
- Production emails visible in dev environment
- Production credentials present

**Resolution**:
1. Verify restore environment:
   ```bash
   echo $RESTORE_ENV  # Should be 'dev' or 'test'
   ```

2. Force sanitization:
   ```bash
   ./scripts/restore-enhanced.sh "$BACKUP_ID" --env=dev --sanitize=true
   ```

3. Manually run sanitization queries (see Data Sanitization section)

#### Issue: S3 upload fails

**Symptoms**:
```
⚠️ AWS CLI not available, skipping S3 upload
```

**Resolution**:
1. Install AWS CLI:
   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. Configure AWS credentials:
   ```bash
   aws configure
   ```

3. Test S3 access:
   ```bash
   aws s3 ls s3://summit-backups-prod/
   ```

4. Retry backup with S3:
   ```bash
   S3_BUCKET=summit-backups-prod ./scripts/backup-enhanced.sh --set=full
   ```

---

## Appendix

### Configuration Files

- **Backup Sets**: `/home/user/summit/config/backup-sets.yaml`
- **Backup Script**: `/home/user/summit/scripts/backup-enhanced.sh`
- **Restore Script**: `/home/user/summit/scripts/restore-enhanced.sh`
- **DR Drill Scenarios**: `/home/user/summit/RUNBOOKS/dr-drill-scenarios.yaml`
- **DR Procedures**: `/home/user/summit/RUNBOOKS/disaster-recovery-procedures.yaml`
- **CI Workflow**: `/home/user/summit/.github/workflows/backup-restore-validation.yml`

### Useful Commands

#### List all backups
```bash
ls -lht backups/
```

#### Find backups by set type
```bash
ls backups/ | grep "summit-backup-full"
ls backups/ | grep "summit-backup-tenant"
```

#### Get backup metadata
```bash
BACKUP_ID=summit-backup-full-20250120T020000Z
cat backups/$BACKUP_ID/backup-metadata.json | jq .
```

#### Calculate backup size
```bash
du -sh backups/*
```

#### Check database row counts
```bash
# PostgreSQL
docker exec postgres psql -U intelgraph -d intelgraph_dev -c "SELECT COUNT(*) FROM entities;"

# Neo4j
docker exec neo4j cypher-shell -u neo4j -p local_dev_pw "MATCH (n) RETURN COUNT(n);"
```

#### Test database connectivity
```bash
docker exec postgres psql -U intelgraph -d intelgraph_dev -c "SELECT version();"
docker exec neo4j cypher-shell -u neo4j -p local_dev_pw "RETURN 'OK';"
docker exec redis redis-cli ping
```

### Contact Information

**Incident Commander**: ops-lead@example.com
**Platform Engineering**: platform-team@example.com
**Database Administrator**: dba@example.com
**Security Team**: security@example.com

**Escalation Path**:
1. On-call engineer (PagerDuty)
2. Senior platform engineer
3. VP of Engineering

---

**Document Version**: 1.0
**Last Reviewed**: 2025-01-20
**Next Review**: 2025-04-20
**Owner**: Platform Engineering Team
