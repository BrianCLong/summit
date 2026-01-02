# Disaster Recovery Runbook

## Purpose

This runbook provides procedures for recovering the Summit platform from catastrophic failures, including complete regional outages, data corruption, and infrastructure loss.

## Recovery Objectives

### RTO (Recovery Time Objective)

**Target**: Service restored within **4 hours** of declared disaster

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| API Server | 1 hour | 5 minutes | P0 (Critical) |
| Authentication | 30 minutes | 1 minute | P0 (Critical) |
| Database (Postgres) | 2 hours | 5 minutes | P0 (Critical) |
| Graph Database (Neo4j) | 3 hours | 15 minutes | P1 (High) |
| Cache (Redis) | 30 minutes | N/A (ephemeral) | P1 (High) |
| Client UI | 1 hour | N/A (static) | P2 (Medium) |

### RPO (Recovery Point Objective)

**Target**: Maximum data loss of **5 minutes**

- Database: Point-in-time recovery available (5-minute granularity)
- Transaction logs: Real-time replication
- File storage: 15-minute snapshots

---

## Disaster Scenarios

### Scenario 1: Complete Region Failure

**Trigger**: AWS region unavailable for > 30 minutes

**Impact**: Total service outage

**Recovery**: Failover to secondary region

### Scenario 2: Database Corruption/Loss

**Trigger**: Database corruption, accidental deletion, ransomware

**Impact**: Service degradation or outage

**Recovery**: Restore from backup

### Scenario 3: Accidental Data Deletion

**Trigger**: Human error, bug in code

**Impact**: Partial data loss

**Recovery**: Point-in-time recovery

### Scenario 4: Complete Infrastructure Loss

**Trigger**: Kubernetes cluster failure, namespace deletion

**Impact**: Total service outage

**Recovery**: Rebuild from infrastructure-as-code

### Scenario 5: Security Breach / Ransomware

**Trigger**: Unauthorized access, data encryption

**Impact**: Data integrity compromise

**Recovery**: Restore from immutable backups

---

## Disaster Declaration

### Declaration Criteria

Declare disaster when:
- ✓ Primary region down > 30 minutes
- ✓ Data corruption affecting > 10% of database
- ✓ Complete database loss
- ✓ Kubernetes cluster unrecoverable
- ✓ Security breach requiring complete rebuild
- ✓ Estimated recovery time > 2 hours

### Declaration Process

1. **Incident Commander** assesses situation
2. **Platform Lead** confirms disaster declaration
3. **CTO** approves DR activation
4. **DR Team** activated via PagerDuty

```bash
# Declare disaster (automated notification)
scripts/dr/declare-disaster.sh \
  --type REGION_FAILURE \
  --severity SEV-1 \
  --estimated-rto 4h
```

---

## DR Procedure: Regional Failover

### Prerequisites

- Secondary region (us-west-2) is warm standby
- Database replication configured and healthy
- DNS managed via Route53 with health checks
- Infrastructure-as-code deployed to secondary region

### Step 1: Assess Primary Region

```bash
# Check AWS status page
open https://status.aws.amazon.com/

# Check primary region health
scripts/dr/check-region-health.sh --region us-east-1

# Verify secondary region is healthy
scripts/dr/check-region-health.sh --region us-west-2
```

### Step 2: Activate Secondary Region

```bash
# Switch DNS to secondary region
scripts/dr/failover-dns.sh --to us-west-2

# Verify DNS propagation
scripts/dr/check-dns.sh --expected us-west-2

# Promote read replica to primary
scripts/dr/promote-database.sh --region us-west-2
```

### Step 3: Scale Up Secondary Region

```bash
# Scale up application servers
kubectl scale deployment/intelgraph-server -n summit-production \
  --replicas=10 --context us-west-2

# Scale up database
scripts/dr/scale-database.sh --region us-west-2 --size xlarge

# Warm up caches
scripts/dr/warm-cache.sh --region us-west-2
```

### Step 4: Verify Service Restoration

```bash
# Run comprehensive health checks
scripts/dr/health-check-comprehensive.sh --region us-west-2

# Run smoke tests
make smoke ENVIRONMENT=production REGION=us-west-2

# Verify critical paths
scripts/verify/check-all.sh --environment production --region us-west-2
```

### Step 5: Monitor and Stabilize

```bash
# Monitor error rates
scripts/monitoring/watch-production-metrics.sh --region us-west-2

# Check database replication lag (should be 0 after promotion)
scripts/dr/check-replication-lag.sh --region us-west-2

# Monitor for 1 hour before declaring success
```

**Expected Timeline**: 2-4 hours

---

## DR Procedure: Database Recovery

### Scenario A: Point-in-Time Recovery (Recent Corruption)

**When**: Data corruption detected within last 7 days

```bash
# 1. Identify corruption time
scripts/db/identify-corruption-time.sh

# 2. Stop all writes
kubectl scale deployment/intelgraph-server -n summit-production --replicas=0

# 3. Create current state backup (for forensics)
scripts/dr/backup-database.sh --reason "pre-pitr-$(date +%Y%m%d)"

# 4. Initiate point-in-time recovery
scripts/dr/restore-database.sh \
  --point-in-time "2026-01-02 14:30:00" \
  --target production

# 5. Verify data integrity
scripts/db/verify-data-integrity.sh --comprehensive

# 6. Resume service
kubectl scale deployment/intelgraph-server -n summit-production --replicas=3

# 7. Run smoke tests
make smoke ENVIRONMENT=production
```

**Expected Timeline**: 2-3 hours

### Scenario B: Full Database Restore (Complete Loss)

**When**: Database completely lost or irreparably corrupted

```bash
# 1. Identify most recent clean backup
scripts/dr/list-backups.sh --sort-by date

# 2. Provision new database instance
scripts/dr/provision-database.sh --environment production

# 3. Restore from backup
scripts/dr/restore-database.sh \
  --backup backup-20260102-120000 \
  --target production-new

# 4. Verify restore integrity
scripts/db/verify-data-integrity.sh \
  --database production-new \
  --comprehensive

# 5. Update connection strings
kubectl set env deployment/intelgraph-server -n summit-production \
  DATABASE_URL="postgresql://user:pass@production-new:5432/summit"

# 6. Restart application
kubectl rollout restart deployment/intelgraph-server -n summit-production

# 7. Run smoke tests
make smoke ENVIRONMENT=production

# 8. Monitor for data consistency
scripts/db/monitor-integrity.sh --duration 1h
```

**Expected Timeline**: 3-4 hours

### Scenario C: Selective Data Recovery (Partial Loss)

**When**: Specific tables or records corrupted/deleted

```bash
# 1. Restore to temporary database
scripts/dr/restore-database.sh \
  --backup backup-20260102-120000 \
  --target production-temp

# 2. Extract affected data
scripts/db/extract-data.sh \
  --database production-temp \
  --tables "users,organizations" \
  --output /tmp/recovered-data.sql

# 3. Verify extracted data
scripts/db/verify-extracted-data.sh --file /tmp/recovered-data.sql

# 4. Apply to production (with transaction)
psql $DATABASE_URL <<EOF
BEGIN;
-- Backup current state
CREATE TABLE users_backup_$(date +%Y%m%d) AS SELECT * FROM users;
-- Restore data
\i /tmp/recovered-data.sql
-- Verify
SELECT COUNT(*) FROM users;
COMMIT;
EOF

# 5. Verify application functionality
make smoke ENVIRONMENT=production
```

**Expected Timeline**: 1-2 hours

---

## DR Procedure: Infrastructure Rebuild

### Complete Kubernetes Cluster Loss

```bash
# 1. Verify backups are accessible
scripts/dr/verify-backups.sh

# 2. Provision new Kubernetes cluster
scripts/infra/provision-cluster.sh \
  --environment production \
  --region us-east-1 \
  --size medium

# 3. Deploy infrastructure components
cd infra
terraform init
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars

# 4. Deploy Helm charts
scripts/infra/deploy-helm-charts.sh --environment production

# 5. Restore application state
scripts/dr/restore-application-state.sh

# 6. Restore databases
scripts/dr/restore-database.sh --backup latest --target production

# 7. Restore secrets (from sealed secrets)
kubectl apply -f infra/sealed-secrets/production/

# 8. Deploy applications
make deploy ENVIRONMENT=production VERSION=latest

# 9. Comprehensive verification
scripts/dr/health-check-comprehensive.sh
make smoke ENVIRONMENT=production
make integration ENVIRONMENT=production
```

**Expected Timeline**: 4-6 hours

---

## DR Procedure: Security Breach Recovery

### Ransomware / Unauthorized Access

```bash
# 1. IMMEDIATELY isolate affected systems
scripts/security/isolate-environment.sh --environment production

# 2. Activate security incident response team
# See INCIDENT_RESPONSE.md - Security Incident Response section

# 3. Assess extent of breach
scripts/security/assess-breach.sh > breach-assessment-$(date +%Y%m%d-%H%M%S).txt

# 4. Preserve forensic evidence
scripts/forensics/capture-state.sh > forensic-capture-$(date +%Y%m%d-%H%M%S).tar.gz

# 5. Verify backup integrity (ensure backups not compromised)
scripts/dr/verify-backup-integrity.sh --comprehensive

# 6. Rotate ALL credentials
scripts/security/rotate-all-credentials.sh --emergency

# 7. Rebuild from clean backups
scripts/dr/rebuild-from-clean-backup.sh \
  --backup verified-clean-backup-20260101 \
  --environment production-rebuild

# 8. Security hardening
scripts/security/harden-environment.sh --environment production-rebuild

# 9. Comprehensive security scan
scripts/security/comprehensive-scan.sh --environment production-rebuild

# 10. Cutover to rebuilt environment
scripts/dr/cutover.sh \
  --from production \
  --to production-rebuild

# 11. Monitor for re-infection
scripts/security/monitor-threats.sh --duration 7d
```

**Expected Timeline**: 8-24 hours

---

## Backup Verification

### Automated Backup Verification (Quarterly)

```bash
# Run automated backup drill
scripts/dr/backup-drill.sh --comprehensive

# This performs:
# 1. Restore backup to isolated environment
# 2. Run data integrity checks
# 3. Run smoke tests against restored data
# 4. Generate verification report
# 5. Clean up test environment
```

### Manual Backup Verification

```bash
# 1. List available backups
scripts/dr/list-backups.sh

# 2. Restore specific backup to test environment
scripts/dr/restore-database.sh \
  --backup backup-20260102-120000 \
  --target test-verification

# 3. Verify data integrity
scripts/db/verify-data-integrity.sh \
  --database test-verification \
  --comprehensive

# 4. Run application against restored data
kubectl set env deployment/intelgraph-server -n test \
  DATABASE_URL="postgresql://user:pass@test-verification:5432/summit"

make smoke ENVIRONMENT=test

# 5. Clean up
scripts/dr/cleanup-test-restore.sh
```

---

## Backup Schedule

### Database Backups

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Continuous WAL | Real-time | 7 days | S3 (us-east-1, us-west-2) |
| Snapshot | Every 4 hours | 30 days | S3 (us-east-1, us-west-2) |
| Daily Full | Daily 2 AM UTC | 90 days | S3 + Glacier |
| Weekly Full | Sunday 2 AM UTC | 1 year | Glacier Deep Archive |

### File Storage Backups

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Incremental | Every 15 minutes | 7 days | S3 |
| Daily Snapshot | Daily 3 AM UTC | 30 days | S3 + Glacier |

### Configuration Backups

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Git (IaC) | On commit | Permanent | GitHub + S3 |
| Sealed Secrets | On change | 90 days | S3 |
| Helm Values | On change | 90 days | S3 |

---

## DR Testing

### Quarterly DR Drill

**Schedule**: First Sunday of each quarter, 2 AM UTC

**Procedure**:
```bash
# Execute comprehensive DR drill
scripts/dr/quarterly-drill.sh

# This tests:
# 1. Regional failover (us-east-1 → us-west-2)
# 2. Database restore
# 3. Infrastructure rebuild
# 4. Application deployment
# 5. Full smoke test suite
# 6. Rollback to primary region
```

**Documentation**: Record results in `evidence/dr-drills/`

### Tabletop Exercises

**Schedule**: Monthly

**Participants**: DR Team, Platform Lead, CTO

**Scenarios**:
- Regional failure
- Database corruption
- Security breach
- Accidental deletion

**Output**: Updated procedures, identified gaps, training needs

---

## DR Team Roles

### Disaster Recovery Commander (DRC)

- Declares disaster
- Coordinates overall response
- Communicates with executives
- Makes go/no-go decisions

**Primary**: Platform Lead
**Secondary**: CTO

### Technical Recovery Lead (TRL)

- Executes technical recovery procedures
- Coordinates engineering team
- Reports status to DRC

**Primary**: Senior Infrastructure Engineer
**Secondary**: Principal Engineer

### Database Recovery Specialist (DRS)

- Handles database restoration
- Verifies data integrity
- Manages replication

**Primary**: Database Administrator
**Secondary**: Backend Lead

### Security Recovery Specialist (SRS)

- Manages security aspects of recovery
- Handles credential rotation
- Conducts security verification

**Primary**: Security Lead
**Secondary**: Security Engineer

### Communications Lead (CL)

- Stakeholder communications
- Status page updates
- Customer notifications

**Primary**: Customer Success Lead
**Secondary**: Product Manager

---

## Recovery Validation Checklist

After any DR procedure, validate:

### Service Health
- [ ] All pods running and healthy
- [ ] All health checks passing
- [ ] Error rate < 1%
- [ ] Response time within SLA

### Data Integrity
- [ ] Database integrity checks pass
- [ ] Row counts match expected
- [ ] Foreign key constraints valid
- [ ] Critical business data verified

### Functionality
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] Database queries succeeding
- [ ] External integrations working

### Security
- [ ] All credentials rotated (if applicable)
- [ ] Security scans clean
- [ ] Access logs reviewed
- [ ] No unauthorized access

### Compliance
- [ ] Audit trail preserved
- [ ] Recovery documented
- [ ] Evidence collected
- [ ] Compliance team notified

### Monitoring
- [ ] All alerts configured
- [ ] Dashboards updated
- [ ] Log aggregation working
- [ ] Metrics collection active

---

## Common DR Scenarios & Quick Reference

### Quick: DNS Failover Only

```bash
scripts/dr/failover-dns.sh --to us-west-2
```

**Time**: 15 minutes

### Quick: Database Point-in-Time Recovery

```bash
scripts/dr/restore-database.sh --point-in-time "2026-01-02 14:30:00"
```

**Time**: 2 hours

### Full: Regional Failover

```bash
scripts/dr/regional-failover.sh --from us-east-1 --to us-west-2
```

**Time**: 4 hours

### Full: Complete Infrastructure Rebuild

```bash
scripts/dr/rebuild-infrastructure.sh --environment production
```

**Time**: 6 hours

---

## Monitoring & Alerting

### DR-Specific Alerts

- Backup job failures (immediate)
- Replication lag > 5 minutes (warning)
- Replication lag > 15 minutes (critical)
- Secondary region health check failures (warning)
- Cross-region latency > 200ms (warning)

### Health Checks

```bash
# Check DR readiness
scripts/dr/check-dr-readiness.sh

# Verify backups are current
scripts/dr/verify-backups.sh

# Check secondary region
scripts/dr/check-secondary-region.sh

# Test failover capability (dry-run)
scripts/dr/test-failover.sh --dry-run
```

---

## Compliance & Audit

For SOC2/ISO compliance:

1. **DR tests are documented**
   ```bash
   scripts/compliance/log-dr-test.sh --test-id <ID>
   ```

2. **Evidence is retained**
   - Test results: 2 years
   - Backup verification: 2 years
   - DR drill reports: 7 years

3. **Procedures are reviewed**
   - Quarterly review of runbooks
   - Annual validation by compliance team

---

## Related Runbooks

- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident response
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [ROLLBACK.md](./ROLLBACK.md) - Rollback procedures

---

## Emergency Contacts

| Service | Contact | Phone | Email |
|---------|---------|-------|-------|
| AWS Support | Enterprise Support | +1-888-xxx-xxxx | aws-support@company.com |
| Database Vendor | 24/7 Support | +1-888-xxx-xxxx | db-support@company.com |
| PagerDuty | On-call | N/A | oncall@company.pagerduty.com |

---

**Last Updated**: 2026-01-02
**Owner**: Platform Engineering Team
**Review Cycle**: Quarterly
**Next DR Drill**: 2026-04-06 (First Sunday of Q2)
