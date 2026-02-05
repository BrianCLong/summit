# MVP-4-GA Deployment Guide

> **Version**: 1.1
> **Last Updated**: 2026-02-05
> **Status**: Production-Ready (Intentionally constrained to current in-repo deployment tooling)
> **Audience**: SRE, DevOps, Release Engineers

---

## Executive Summary

This guide provides **step-by-step deployment procedures** for promoting Summit MVP-4 to General Availability (GA). It covers pre-deployment checks, deployment execution, and post-deployment verification.

**Deployment Philosophy**: "Slow is smooth, smooth is fast. Verify at every step."

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Environment Preparation](#2-environment-preparation)
3. [Database Migration](#3-database-migration)
4. [Application Deployment](#4-application-deployment)
5. [Policy Deployment](#5-policy-deployment)
6. [Verification](#6-verification)
7. [Rollback Procedures](#7-rollback-procedures)
8. [Post-Deployment](#8-post-deployment)

---

## 1. Pre-Deployment Checklist

### 1.1 Release Readiness

```bash
# Verify all CI gates passed
gh run list --workflow=mvp4-gate.yml --branch=main --limit=1
# Expected: ✓ All checks passed

# Verify acceptance criteria met
./scripts/compliance/acceptance-check.sh
# Expected: 100% acceptance score
```

- [ ] MVP-4 gate workflow passed
- [ ] All acceptance criteria satisfied
- [ ] Security scan clear (0 critical CVEs)
- [ ] Performance tests passed
- [ ] Rollback tested in staging

### 1.2 Team Readiness

- [ ] **Release Captain** assigned and briefed
- [ ] **On-Call SRE** alerted and standing by
- [ ] **Security Team** notified of deployment window
- [ ] **War Room** established (Slack channel + Zoom)
- [ ] **Status Page** prepared for announcement

### 1.3 Communication

**Internal Announcement** (24h before):
```
Subject: MVP-4-GA Deployment - [DATE] [TIME]

Team,

We will be deploying Summit MVP-4-GA to production on [DATE] at [TIME].

Expected Duration: 30 minutes
Expected Downtime: None (rolling update)
Rollback Window: 4 hours

War Room: [ZOOM_LINK]
Status: [STATUS_PAGE_LINK]

Please avoid making manual changes during this window.

- Release Captain
```

**External Announcement**:
```
We will be performing scheduled maintenance on [DATE] from [TIME] to [TIME].
You may experience brief interruptions. No action required.
```

---

## 2. Environment Preparation

### 2.1 Backup Critical Data

```bash
# Backup all databases
./scripts/backup.sh --env=production --full

# Verify backups
./scripts/backup-restore-validation.sh --latest

# Expected: All backups valid and restorable
```

**Wait for confirmation**: ✅ Backups completed successfully

### 2.2 Verify Infrastructure

```bash
# Summit production readiness preflight
./scripts/ops/production-readiness-check-summit.sh

# Check Kubernetes cluster health
kubectl get nodes
# Expected: All nodes Ready

kubectl top nodes
# Expected: <70% CPU, <80% memory

# Check database health
psql -h $DB_HOST -U $DB_USER -c "SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn();"
# Expected: f (not in recovery), valid LSN

# Check Redis health
redis-cli -h $REDIS_HOST ping
# Expected: PONG
```

- [ ] All nodes healthy
- [ ] Database primary accepting writes
- [ ] Redis accessible
- [ ] Sufficient capacity for rollout

### 2.3 Create Deployment Tag

```bash
# Tag the release
git tag -a v4.0.0-ga -m "MVP-4 General Availability Release"
git push origin v4.0.0-ga

# Trigger release build
gh workflow run release-ga.yml --ref v4.0.0-ga
```

**Wait for build**: Monitor GitHub Actions until completion (~10 minutes)

---

## 3. Database Migration

### 3.1 Backup Pre-Migration

```bash
# Create migration checkpoint
pg_dump -h $DB_HOST -U $DB_USER -Fc intelgraph > intelgraph-pre-v4-$(date +%s).dump

# Upload to S3
aws s3 cp intelgraph-pre-v4-*.dump s3://summit-backups/migrations/
```

**Verify**: ✅ Backup uploaded successfully

### 3.2 Test Migration (Dry Run)

```bash
# Clone production to staging
./scripts/db/clone-prod-to-staging.sh

# Run migration on staging
pnpm db:migrate --env=staging

# Verify schema
pnpm schema:validate --env=staging
# Expected: Schema valid
```

- [ ] Dry run successful
- [ ] No errors in migration logs
- [ ] Rollback tested on staging

### 3.3 Production Migration

```bash
# Set maintenance mode (optional, if brief downtime acceptable)
kubectl scale deployment summit-server --replicas=0

# Run migration
pnpm db:migrate --env=production

# Verify
psql -h $DB_HOST -U $DB_USER -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
# Expected: Latest migration version

# Check for locks or blocking queries
psql -h $DB_HOST -U $DB_USER -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

**Expected Duration**: < 5 minutes
**Acceptance**: Migration completes with exit code 0

---

## 4. Application Deployment

### 4.1 Deploy OPA Policies First

```bash
# Update policy bundle
opa build -b policies/ -o bundles/main-v4.0.0.tar.gz

# Sign bundle
cosign sign-blob bundles/main-v4.0.0.tar.gz > bundles/main-v4.0.0.tar.gz.sig

# Upload to registry
oras push ghcr.io/summit/policies:v4.0.0 \
  bundles/main-v4.0.0.tar.gz:application/vnd.oci.image.layer.v1.tar+gzip

# Verify OPA instances pull new bundle
kubectl logs -n governance deployment/opa --tail=100 | grep "bundle loaded"
# Expected: "Bundle 'main' loaded successfully (version: v4.0.0)"
```

- [ ] Policy bundle built
- [ ] Bundle signed
- [ ] OPA instances updated
- [ ] Policy tests passing

### 4.2 Deploy Application (Rolling Update)

```bash
# Recommended: use the production deployment script
./scripts/deploy-summit-production.sh deploy

# Direct Helm command (if needed)
helm upgrade summit ./charts/summit \
  -f charts/summit/values.prod.yaml \
  --namespace summit-prod \
  --set image.tag=v4.0.0-ga \
  --wait \
  --timeout=10m

# Monitor rollout
kubectl rollout status deployment/summit -n summit-prod

# Expected: "deployment 'summit' successfully rolled out"
```

**Deployment Strategy**:
- Rolling update: 0 unavailable, 1 surge
- Update 1 pod at a time
- Wait 30s between pod updates
- Auto-rollback on health check failure

### 4.3 Verify Pod Health

```bash
# Check pod status
kubectl get pods -n summit-prod -l app.kubernetes.io/instance=summit

# Expected: All pods Running, Ready 1/1

# Check logs for errors
kubectl logs -n summit-prod deployment/summit --tail=100 | grep -i error
# Expected: No errors
```

---

## 5. Policy Deployment

### 5.1 Verify Policy Evaluation

```bash
# Test policy endpoint
curl -X POST https://api.summit.internal/v1/policy/evaluate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "entity.read",
    "user": {"id": "test-user", "clearances": ["TS"]},
    "resource": {"id": "test-entity", "classification": "S"}
  }'

# Expected: {"approved": true, "decision": "ALLOW", "policyVersion": "v4.0.0"}
```

- [ ] Policy evaluation responding
- [ ] Correct policy version loaded
- [ ] Test cases passing

---

## 6. Verification

### 6.1 Smoke Tests

```bash
# Run automated production smoke test suite
API_URL="https://summit.example.com" ./scripts/smoke-test-production.sh

# Expected: All tests passed
```

**Manual Smoke Tests**:
1. ✅ User can log in
2. ✅ User can read permitted entities
3. ✅ User is denied access to restricted entities
4. ✅ High-risk operation triggers approval workflow
5. ✅ Audit trail records all actions

### 6.2 Health Checks

```bash
# API health
curl https://api.summit.internal/health
# Expected: {"status": "healthy", "version": "v4.0.0-ga"}

# Database health
curl https://api.summit.internal/health/db
# Expected: {"status": "connected", "latency": "<5ms"}

# Policy engine health
curl https://api.summit.internal/health/policy
# Expected: {"status": "healthy", "bundleVersion": "v4.0.0"}
```

### 6.3 Metrics Check

```bash
# Check error rate
curl -s "http://prometheus.internal/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | jq .
# Expected: < 0.1% error rate

# Check latency
curl -s "http://prometheus.internal/api/v1/query?query=histogram_quantile(0.95, http_request_duration_seconds_bucket)" | jq .
# Expected: < 200ms p95
```

### 6.4 End-to-End Test

```bash
# Run critical user journey
./scripts/e2e/critical-path-test.sh --env=production

# Expected: All journeys successful
```

---

## 7. Rollback Procedures

### 7.1 Application Rollback

```bash
# Immediately revert to previous version
helm rollback summit-prod 0

# Verify rollback
kubectl rollout status deployment/summit-server -n production
```

**Expected Duration**: < 3 minutes

### 7.2 Policy Rollback

```bash
# Revert to previous policy bundle
oras pull ghcr.io/summit/policies:v3.0.0-ga
kubectl create configmap opa-bundle-v3 --from-file=bundles/main-v3.0.0.tar.gz
kubectl set env deployment/opa -n governance BUNDLE_VERSION=v3.0.0-ga
kubectl rollout restart deployment/opa -n governance
```

### 7.3 Database Rollback

```bash
# Restore from pre-migration backup
pg_restore -h $DB_HOST -U $DB_USER -d intelgraph --clean intelgraph-pre-v4-*.dump

# Verify
psql -h $DB_HOST -U $DB_USER -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
# Expected: Previous migration version
```

**⚠️ WARNING**: Database rollback results in data loss. Only use if corruption detected.

---

## 8. Post-Deployment

### 8.1 Enable Full Traffic

```bash
# If canary deployment was used, promote to 100%
kubectl patch service summit-server -n production -p '{"spec":{"selector":{"version":"v4.0.0"}}}'

# Verify traffic distribution
./scripts/observability/traffic-check.sh
# Expected: 100% traffic to v4.0.0
```

### 8.2 Monitor SLOs

**First Hour**:
- [ ] Error rate < 0.1%
- [ ] P95 latency < 200ms
- [ ] No security alerts
- [ ] No policy evaluation failures

**First 24 Hours**:
- [ ] Error budget burn rate acceptable
- [ ] No user-reported incidents
- [ ] Audit trail growing normally
- [ ] Resource utilization stable

### 8.3 Communication

**Internal**:
```
MVP-4-GA Deployment COMPLETE ✅

Version: v4.0.0-ga
Deployed: [TIMESTAMP]
Status: All systems nominal
Issues: None

Metrics:
- Error Rate: 0.02%
- P95 Latency: 145ms
- Active Users: [COUNT]

Thank you for your patience.
```

**External**:
```
Scheduled maintenance complete. All systems operational.
```

### 8.4 Handoff to Operations

```bash
# Generate deployment report
./scripts/deployment/generate-report.sh --version=v4.0.0-ga > reports/v4-deployment-$(date +%s).md

# Archive logs
./scripts/deployment/archive-logs.sh --version=v4.0.0-ga
```

- [ ] Deployment report generated
- [ ] Logs archived
- [ ] On-call briefed
- [ ] War room closed

---

## 9. Deployment Decision Tree

```
START
  │
  ├─ Pre-checks passed? ─NO─> ABORT
  │                      YES
  ├─ Backup successful? ─NO─> ABORT
  │                     YES
  ├─ Migration dry run passed? ─NO─> Fix and retry
  │                             YES
  ├─ Deploy to production
  │
  ├─ Smoke tests passed? ─NO─> ROLLBACK
  │                      YES
  ├─ Health checks green? ─NO─> ROLLBACK
  │                       YES
  ├─ Metrics acceptable? ─NO─> ROLLBACK
  │                      YES
  └─ SUCCESS ✅
```

---

## 10. Deployment Runbook Quick Reference

| Phase | Duration | Rollback Time |
|-------|----------|---------------|
| **Pre-checks** | 10 min | N/A |
| **Backup** | 5 min | N/A |
| **Migration** | 5 min | 10 min (PITR) |
| **App Deploy** | 10 min | 3 min |
| **Verification** | 10 min | 3 min |
| **Total** | **40 min** | **<15 min** |

---

**Document Control**:
- **Version**: 1.1
- **Owner**: SRE Team
- **Approvers**: Release Captain, Infrastructure Lead
- **Next Review**: Post-GA +30 days

---

## Evidence (In-Repo Sources)

- **Production deploy script**: `scripts/deploy-summit-production.sh`
- **Helm chart**: `charts/summit/Chart.yaml`
- **Prod values**: `charts/summit/values.prod.yaml`
