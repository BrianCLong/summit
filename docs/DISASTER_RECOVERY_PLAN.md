# Summit/IntelGraph Disaster Recovery and Business Continuity Plan

**Version**: 2.0
**Last Updated**: 2025-11-21
**Classification**: Internal Use
**Owner**: Platform Engineering Team
**Approval**: Engineering Leadership

---

## Executive Summary

This document defines the comprehensive disaster recovery (DR) and business continuity (BC) strategy for the Summit/IntelGraph platform. It establishes recovery objectives, backup procedures, failover mechanisms, and testing protocols to ensure platform resilience and data protection.

---

## Table of Contents

1. [Recovery Objectives](#1-recovery-objectives)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Backup Strategy](#3-backup-strategy)
4. [High Availability Configuration](#4-high-availability-configuration)
5. [Disaster Recovery Procedures](#5-disaster-recovery-procedures)
6. [Incident Response](#6-incident-response)
7. [Testing and Validation](#7-testing-and-validation)
8. [Roles and Responsibilities](#8-roles-and-responsibilities)
9. [Communication Plan](#9-communication-plan)
10. [Appendices](#10-appendices)

---

## 1. Recovery Objectives

### 1.1 Recovery Time Objective (RTO)

| Tier | Component | RTO | Description |
|------|-----------|-----|-------------|
| **Tier 1** | API Gateway, Authentication | 5 minutes | Critical path services |
| **Tier 1** | GraphQL API | 5 minutes | Core application functionality |
| **Tier 2** | PostgreSQL Database | 15 minutes | Relational data store |
| **Tier 2** | Neo4j Graph Database | 15 minutes | Graph data store |
| **Tier 3** | Redis Cache/Queue | 5 minutes | Can be rebuilt from persistent stores |
| **Tier 3** | Analytics Engine | 30 minutes | Non-critical for core operations |
| **Tier 4** | Copilot/AI Services | 60 minutes | Enhanced features |

**Overall Platform RTO**: 15 minutes for core functionality, 60 minutes for full recovery.

### 1.2 Recovery Point Objective (RPO)

| Data Store | RPO | Backup Method | Retention |
|------------|-----|---------------|-----------|
| PostgreSQL | 5 minutes | WAL archiving + streaming replication | 30 days |
| Neo4j | 15 minutes | Incremental backups + transaction logs | 30 days |
| Redis | 1 hour | RDB snapshots + AOF | 7 days |
| Evidence Files | 0 (sync) | S3 cross-region replication | 90 days |
| Kubernetes Configs | 0 (GitOps) | Git repository | Indefinite |

### 1.3 Service Level Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Monthly uptime |
| MTTR (Mean Time to Recovery) | < 30 minutes | Per incident |
| MTBF (Mean Time Between Failures) | > 720 hours | Rolling 90 days |
| Data Durability | 99.999999999% | Annual |
| Backup Success Rate | > 99% | Daily |
| DR Test Success Rate | 100% | Quarterly |

---

## 2. System Architecture Overview

### 2.1 Production Environment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRIMARY REGION (us-east-1)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   Ingress   │───▶│  API Pods   │───▶│  Services   │                  │
│  │  (HA Proxy) │    │  (3+ replicas)   │  (Copilot)  │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ PostgreSQL  │    │   Neo4j     │    │   Redis     │                  │
│  │  Primary    │    │  Primary    │    │  Sentinel   │                  │
│  │  + Replica  │    │  + Replica  │    │  Cluster    │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    S3 Backup Bucket (Encrypted)                  │    │
│  │                    Cross-Region Replication Enabled              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Async Replication
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DR REGION (us-west-2)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   Ingress   │    │  API Pods   │    │  Services   │                  │
│  │  (Standby)  │    │  (Scaled 0) │    │  (Standby)  │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ PostgreSQL  │    │   Neo4j     │    │   Redis     │                  │
│  │  Standby    │    │  Standby    │    │  Standby    │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Critical Data Stores

| Store | Data Type | Size (Est.) | Criticality |
|-------|-----------|-------------|-------------|
| PostgreSQL | Users, tenants, investigations, audit logs | 50-500 GB | Critical |
| Neo4j | Entities, relationships, graph structure | 10-100 GB | Critical |
| Redis | Sessions, cache, job queues | 1-10 GB | High |
| S3/Evidence | Uploaded files, STIX bundles, reports | 100+ GB | Critical |
| Kubernetes | Configs, secrets, state | < 1 GB | Critical |

---

## 3. Backup Strategy

### 3.1 Backup Schedule

| Component | Full Backup | Incremental | WAL/Transaction Log |
|-----------|-------------|-------------|---------------------|
| PostgreSQL | Daily 02:00 UTC | Every 4 hours | Continuous streaming |
| Neo4j | Daily 03:00 UTC | Every 6 hours | Transaction log backup |
| Redis | Daily 04:00 UTC | Hourly RDB | AOF with fsync |
| Evidence Files | Continuous sync | N/A | S3 versioning |
| K8s Configs | On change | N/A | GitOps (Flux/ArgoCD) |

### 3.2 Backup Storage

**Primary Backup Location**: `s3://intelgraph-backups-{env}/`

```
s3://intelgraph-backups-prod/
├── postgresql/
│   ├── full/
│   │   └── YYYY-MM-DD/
│   │       └── intelgraph_prod.dump.enc
│   ├── incremental/
│   │   └── YYYY-MM-DD/
│   │       └── HH-MM/
│   └── wal/
│       └── archive/
├── neo4j/
│   ├── full/
│   │   └── YYYY-MM-DD/
│   │       └── neo4j.dump.enc
│   └── incremental/
│       └── YYYY-MM-DD/
├── redis/
│   ├── rdb/
│   │   └── YYYY-MM-DD/
│   │       └── dump.rdb.enc
│   └── aof/
└── metadata/
    └── backup-manifest.json
```

### 3.3 Encryption and Security

- **At Rest**: AES-256 encryption using AWS KMS customer-managed keys
- **In Transit**: TLS 1.3 for all backup transfers
- **Key Rotation**: Automatic annual rotation with 90-day overlap
- **Access Control**: IAM roles with least-privilege, MFA required for manual access

### 3.4 Retention Policy

| Backup Type | Retention | Storage Class |
|-------------|-----------|---------------|
| Daily Full | 30 days | S3 Standard |
| Weekly Full | 90 days | S3 Standard-IA |
| Monthly Full | 1 year | S3 Glacier |
| Annual Full | 7 years | S3 Glacier Deep Archive |
| WAL Archives | 7 days | S3 Standard |
| Incremental | 7 days | S3 Standard |

---

## 4. High Availability Configuration

### 4.1 PostgreSQL HA

**Configuration**: Streaming replication with automatic failover

```yaml
# Primary Configuration
postgresql:
  replication:
    enabled: true
    mode: synchronous
    numSyncReplicas: 1
    applicationName: intelgraph-ha

  # Connection pooling
  pgpool:
    enabled: true
    numInitChildren: 32
    maxPool: 4

  # Health checks
  livenessProbe:
    initialDelaySeconds: 30
    periodSeconds: 10
    failureThreshold: 6
  readinessProbe:
    initialDelaySeconds: 5
    periodSeconds: 10
    successThreshold: 1
```

**Failover Process**:
1. Primary failure detected via health checks
2. Patroni/pg_auto_failover promotes replica
3. Connection pool redirects traffic
4. Alert sent to operations team
5. New replica provisioned automatically

### 4.2 Neo4j HA

**Configuration**: Causal clustering (Enterprise) or warm standby (Community)

```yaml
neo4j:
  core:
    numberOfServers: 3

  causalClustering:
    enabled: true
    minimumCoreClusterSizeAtFormation: 3
    minimumCoreClusterSizeAtRuntime: 2

  readReplica:
    numberOfServers: 2

  # Backup configuration
  backup:
    enabled: true
    schedule: "0 3 * * *"
```

### 4.3 Redis HA

**Configuration**: Redis Sentinel with automatic failover

```yaml
redis:
  sentinel:
    enabled: true
    masterSet: intelgraph-master
    quorum: 2

  replica:
    replicaCount: 2

  persistence:
    enabled: true
    storageClass: fast-ssd

  # Memory management
  maxmemory: 4gb
  maxmemoryPolicy: allkeys-lru
```

### 4.4 Application Layer HA

```yaml
# Deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intelgraph-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: intelgraph-api
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
```

---

## 5. Disaster Recovery Procedures

### 5.1 DR Activation Criteria

**Automatic Failover** (no human intervention required):
- Single pod/container failure
- Single node failure
- Database replica lag > 30 seconds

**Manual Failover** (requires approval):
- Primary region network outage > 15 minutes
- Multiple AZ failure in primary region
- Data corruption detected
- Security incident requiring isolation

**Full DR Activation** (executive approval required):
- Complete region failure
- Major natural disaster
- Sustained attack/compromise

### 5.2 Failover Procedures

#### 5.2.1 Database Failover (PostgreSQL)

```bash
#!/bin/bash
# PostgreSQL Failover Procedure

# 1. Verify primary is truly unavailable
pg_isready -h $PRIMARY_HOST -p 5432 -t 30
if [ $? -eq 0 ]; then
    echo "Primary is still available, aborting failover"
    exit 1
fi

# 2. Promote replica to primary
kubectl exec -n $NAMESPACE postgresql-replica-0 -- \
    pg_ctl promote -D /var/lib/postgresql/data

# 3. Update connection strings
kubectl patch configmap postgresql-config -n $NAMESPACE \
    --patch '{"data":{"primary.host":"postgresql-replica-0"}}'

# 4. Restart application pods to pick up new config
kubectl rollout restart deployment/intelgraph-api -n $NAMESPACE

# 5. Verify connectivity
kubectl exec -it deployment/intelgraph-api -- \
    psql -h postgresql-replica-0 -U intelgraph -c "SELECT 1;"
```

#### 5.2.2 Region Failover

```bash
#!/bin/bash
# Full Region Failover Procedure

DR_REGION="us-west-2"
PRIMARY_REGION="us-east-1"

# 1. Verify DR region is healthy
./scripts/dr/verify-dr-region.sh --region $DR_REGION

# 2. Stop replication from primary (if accessible)
./scripts/dr/stop-replication.sh --source $PRIMARY_REGION || true

# 3. Promote DR databases
./scripts/dr/promote-databases.sh --region $DR_REGION

# 4. Scale up DR application layer
kubectl --context dr-cluster scale deployment/intelgraph-api --replicas=5

# 5. Update DNS to point to DR region
./scripts/dr/update-dns.sh --target $DR_REGION

# 6. Verify health
./scripts/dr/verify-health.sh --region $DR_REGION

# 7. Notify stakeholders
./scripts/dr/send-notification.sh --event "DR_ACTIVATED" --region $DR_REGION
```

### 5.3 Restoration Procedures

#### 5.3.1 Point-in-Time Recovery (PostgreSQL)

```bash
#!/bin/bash
# PITR Restoration

TARGET_TIME="2025-11-21 10:30:00 UTC"
BACKUP_BUCKET="s3://intelgraph-backups-prod/postgresql"

# 1. Stop application traffic
kubectl scale deployment/intelgraph-api --replicas=0

# 2. Download base backup
aws s3 cp $BACKUP_BUCKET/full/latest/intelgraph_prod.dump.enc /tmp/

# 3. Decrypt backup
aws kms decrypt --ciphertext-blob fileb:///tmp/intelgraph_prod.dump.enc \
    --output text --query Plaintext | base64 -d > /tmp/intelgraph_prod.dump

# 4. Restore base backup
pg_restore -h localhost -U postgres -d intelgraph_restore /tmp/intelgraph_prod.dump

# 5. Apply WAL logs up to target time
cat > /tmp/recovery.conf <<EOF
restore_command = 'aws s3 cp $BACKUP_BUCKET/wal/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# 6. Start PostgreSQL with recovery config
pg_ctl start -D /var/lib/postgresql/data

# 7. Verify data integrity
./scripts/dr/verify-data-integrity.sh

# 8. Resume application traffic
kubectl scale deployment/intelgraph-api --replicas=3
```

---

## 6. Incident Response

### 6.1 Severity Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **SEV1** | Complete outage, data loss risk | Immediate | VP Engineering |
| **SEV2** | Major degradation, partial outage | 15 minutes | Engineering Manager |
| **SEV3** | Minor degradation, workaround available | 1 hour | Team Lead |
| **SEV4** | Cosmetic issues, no user impact | Next business day | On-call |

### 6.2 Incident Response Workflow

```
┌─────────────────┐
│  Alert Fired    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ On-Call Ack     │◀──── PagerDuty (5 min SLA)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Triage &        │
│ Classification  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ SEV1-2│ │ SEV3-4│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ War   │ │ Normal│
│ Room  │ │ Triage│
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│ Resolution      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-Incident   │
│ Review (72h)    │
└─────────────────┘
```

### 6.3 Communication Templates

**Initial Incident Notification**:
```
INCIDENT DECLARED - IntelGraph Platform

Severity: [SEV1/SEV2/SEV3/SEV4]
Status: Investigating
Start Time: [TIMESTAMP UTC]
Impact: [Description of user impact]

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [TIME] or sooner if status changes
Incident Commander: [NAME]

Status Page: https://status.intelgraph.ai
```

**Resolution Notification**:
```
INCIDENT RESOLVED - IntelGraph Platform

Duration: [X hours Y minutes]
Root Cause: [Brief description]
Resolution: [What fixed it]

Impact Summary:
- Users affected: [NUMBER]
- Transactions impacted: [NUMBER]
- Data loss: [None/Description]

Follow-up:
- Post-incident review: [DATE]
- Preventive measures: [In progress/Completed]
```

---

## 7. Testing and Validation

### 7.1 Testing Schedule

| Test Type | Frequency | Scope | Owner |
|-----------|-----------|-------|-------|
| Backup Verification | Daily | Automated integrity checks | SRE |
| Restore Test | Weekly | Single database restore | SRE |
| Failover Drill | Monthly | Database failover | Platform Team |
| DR Simulation | Quarterly | Full region failover | Engineering |
| Chaos Engineering | Monthly | Random failure injection | SRE |
| Tabletop Exercise | Semi-annually | Full team walkthrough | Leadership |

### 7.2 Chaos Engineering Experiments

```yaml
# Chaos Mesh Experiment: Database Pod Kill
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: postgres-pod-kill
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - intelgraph-staging
    labelSelectors:
      app: postgresql
  scheduler:
    cron: "0 10 * * 1"  # Monday 10:00 UTC
---
# Network Partition Experiment
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-to-db-partition
  namespace: chaos-testing
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - intelgraph-staging
    labelSelectors:
      app: intelgraph-api
  direction: to
  target:
    selector:
      namespaces:
        - intelgraph-staging
      labelSelectors:
        app: postgresql
  duration: "5m"
```

### 7.3 Success Criteria

| Test | Success Criteria |
|------|------------------|
| Backup Verification | Checksum match, file integrity, encryption valid |
| Restore Test | Data integrity verified, < 15 min RTO |
| Failover Drill | Automatic failover < 2 min, zero data loss |
| DR Simulation | Full recovery < 60 min, RPO met |
| Chaos Engineering | Service recovers within SLA, no cascading failures |

### 7.4 Test Documentation

Each test must produce:
1. **Pre-test checklist** completion
2. **Execution log** with timestamps
3. **Metrics capture** (RTO/RPO actual vs target)
4. **Issue log** for any problems encountered
5. **Post-test report** with recommendations

---

## 8. Roles and Responsibilities

### 8.1 DR Team Structure

| Role | Responsibilities | Primary | Backup |
|------|------------------|---------|--------|
| **Incident Commander** | Overall coordination, decisions | On-call Lead | Engineering Manager |
| **Technical Lead** | Technical diagnosis, resolution | Senior SRE | Platform Engineer |
| **Communications** | Stakeholder updates, status page | Product Manager | Engineering Manager |
| **Scribe** | Documentation, timeline | Any engineer | Automated logging |
| **Subject Matter Expert** | Database/infra expertise | DBA | Cloud Engineer |

### 8.2 Escalation Matrix

```
Level 1: On-Call Engineer
    │
    ├── 15 min no resolution ──▶ Level 2: Team Lead
    │                               │
    │                               ├── 30 min no resolution ──▶ Level 3: Engineering Manager
    │                               │                               │
    │                               │                               └── 60 min no resolution ──▶ Level 4: VP Engineering
    │                               │
    │                               └── Data loss risk ──▶ Level 4: VP Engineering + Legal
    │
    └── SEV1 declared ──▶ Level 3: Engineering Manager (immediate)
```

---

## 9. Communication Plan

### 9.1 Internal Communication

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| Engineering | Slack #incidents | Real-time | Technical details |
| Leadership | Email + Slack | Every 30 min | Summary, ETA |
| All Staff | Email | Start/End | High-level impact |

### 9.2 External Communication

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| Customers | Status Page | Real-time | Service status |
| Enterprise | Direct email | Hourly | Detailed updates |
| Partners | API status | Real-time | Integration status |

### 9.3 Status Page Categories

- **Operational**: All systems functioning normally
- **Degraded Performance**: Slower than normal, but functional
- **Partial Outage**: Some features unavailable
- **Major Outage**: Core functionality impacted
- **Maintenance**: Planned downtime

---

## 10. Appendices

### 10.1 Quick Reference Commands

```bash
# Check backup status
./scripts/dr/backup-status.sh

# Verify last backup
./scripts/dr/verify-backup.sh --latest

# Manual backup trigger
./scripts/dr/trigger-backup.sh --type full --component all

# Check replication lag
./scripts/dr/check-replication-lag.sh

# Test failover (dry-run)
./scripts/dr/failover.sh --dry-run --component postgresql

# Full DR drill
./scripts/dr/dr-drill.sh --environment staging
```

### 10.2 Key Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| VP Engineering | [REDACTED] | +1-XXX-XXX-XXXX | vp-eng@company.com |
| SRE Lead | [REDACTED] | +1-XXX-XXX-XXXX | sre-lead@company.com |
| DBA Lead | [REDACTED] | +1-XXX-XXX-XXXX | dba-lead@company.com |
| Security Lead | [REDACTED] | +1-XXX-XXX-XXXX | security@company.com |

### 10.3 Related Documentation

- [Backup Runbook](../runbooks/backup_runbook.md)
- [Chaos Engineering Runbook](../runbooks/chaos-drill-runbooks.md)
- [Incident Response Playbook](../../charts/monitoring/runbooks/incident-response-playbook.md)
- [Database Failure Recovery](../runbooks/database-failure-recovery.md)
- [Security Incident Response](../runbooks/security-incident-response.md)

### 10.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2025-11-21 | Platform Team | Comprehensive overhaul, added HA configs |
| 1.0 | 2025-09-25 | Jules | Initial DR documentation |

---

**Document Approval**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | Platform Engineering | 2025-11-21 | |
| Technical Review | SRE Team | | |
| Business Review | Product Management | | |
| Final Approval | VP Engineering | | |
