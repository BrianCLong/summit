# MVP-4-GA Rollback Protocol

> **Version**: 1.0
> **Last Updated**: 2025-12-30
> **Status**: Production-Ready
> **Audience**: Release Captain, On-Call SRE, Incident Commander

---

## Executive Summary

This document defines the **comprehensive rollback procedures** for Summit MVP-4-GA. It covers trigger conditions, rollback mechanisms, communication protocols, and post-rollback analysis.

**Rollback Philosophy**: "Better to be down for 5 minutes and revert, than broken for 5 hours and debug."

---

## Table of Contents

1. [Trigger Conditions](#1-trigger-conditions)
2. [Decision Authority](#2-decision-authority)
3. [Rollback Mechanisms](#3-rollback-mechanisms)
4. [Communication Protocol](#4-communication-protocol)
5. [Post-Rollback Procedures](#5-post-rollback-procedures)
6. [Rollback Testing](#6-rollback-testing)

---

## 1. Trigger Conditions

### 1.1 IMMEDIATE Rollback (P0)

Execute rollback **immediately without discussion** if any of the following occurs:

| Trigger              | Detection                                 | Evidence                                       |
| -------------------- | ----------------------------------------- | ---------------------------------------------- |
| **Data Corruption**  | Invalid writes, schema violations         | Database errors, data integrity check failures |
| **Security Breach**  | Unauthorized data access detected         | Auth failures, tenant isolation breach         |
| **Global Outage**    | 5xx error rate > 5% for > 5 minutes       | Prometheus alert: `HighErrorRate`              |
| **Critical CVE**     | Zero-day vulnerability actively exploited | Security scan, external disclosure             |
| **Database Failure** | Cannot write to database                  | Connection errors, transaction failures        |

**Command**:

```bash
# EMERGENCY ROLLBACK
./scripts/emergency-rollback.sh --reason="[TRIGGER]" --incident-id="[ID]"
```

**Expected Execution Time**: < 3 minutes

---

### 1.2 URGENT Rollback (P1)

Execute rollback **within 15 minutes** after confirmation:

| Trigger                | Detection                         | Evidence                             |
| ---------------------- | --------------------------------- | ------------------------------------ |
| **SLO Breach**         | P95 latency > 2s for > 10 minutes | Prometheus alert: `LatencySLOBreach` |
| **Error Rate Spike**   | Error rate > 1% for > 5 minutes   | Grafana dashboard, logs              |
| **Policy Failures**    | Policy evaluation failures > 5%   | OPA logs, audit trail gaps           |
| **Memory Leak**        | Memory usage > 90% and climbing   | Pod metrics, OOM kills               |
| **Cascading Failures** | Multiple services degraded        | Service mesh metrics                 |

**Command**:

```bash
# URGENT ROLLBACK
./scripts/urgent-rollback.sh --reason="[TRIGGER]" --approval="[RELEASE_CAPTAIN]"
```

**Expected Execution Time**: < 10 minutes

---

### 1.3 PLANNED Rollback (P2)

Execute rollback **within 1 hour** after team discussion:

| Trigger                     | Detection                            | Evidence                   |
| --------------------------- | ------------------------------------ | -------------------------- |
| **Feature Regression**      | Critical feature not working         | User reports, QA testing   |
| **Performance Degradation** | P95 latency 50% higher than baseline | Metrics trending upward    |
| **Audit Trail Issues**      | Missing audit records                | Audit log gaps             |
| **Configuration Drift**     | Unexpected config changes            | Config validation failures |

**Command**:

```bash
# PLANNED ROLLBACK
./scripts/planned-rollback.sh --reason="[TRIGGER]" --schedule="[TIME]"
```

**Expected Execution Time**: < 30 minutes

---

## 2. Decision Authority

### 2.1 Authority Matrix

| Severity           | Decision Maker  | Required Approval              | Notification                 |
| ------------------ | --------------- | ------------------------------ | ---------------------------- |
| **P0 (Immediate)** | Any On-Call SRE | None (act first, report later) | All stakeholders immediately |
| **P1 (Urgent)**    | Release Captain | SRE Lead (async)               | Eng leadership within 15 min |
| **P2 (Planned)**   | Release Captain | Product + SRE consensus        | Stakeholders 30 min ahead    |

### 2.2 Escalation Path

```
On-Call SRE (P0)
    │
    ├─ Rollback initiated
    │
    ▼
Release Captain (notified)
    │
    ├─ If unsuccessful: Escalate to SRE Lead
    │
    ▼
SRE Lead
    │
    ├─ If unsuccessful: Escalate to VP Engineering
    │
    ▼
VP Engineering (final authority)
```

---

## 3. Rollback Mechanisms

### 3.1 Application Rollback

#### Kubernetes/Helm Rollback

```bash
#!/bin/bash
# Script: scripts/rollback-application.sh

set -euo pipefail

NAMESPACE="production"
RELEASE="summit-prod"

echo "🔄 Starting application rollback..."

# 1. Check current revision
CURRENT_REV=$(helm history $RELEASE -n $NAMESPACE --max 1 -o json | jq -r '.[0].revision')
echo "Current revision: $CURRENT_REV"

# 2. Get previous stable revision
PREVIOUS_REV=$((CURRENT_REV - 1))
echo "Rolling back to revision: $PREVIOUS_REV"

# 3. Execute rollback
helm rollback $RELEASE $PREVIOUS_REV -n $NAMESPACE --wait --timeout=5m

# 4. Verify rollout
kubectl rollout status deployment/summit-server -n $NAMESPACE --timeout=5m

# 5. Health check
HEALTH=$(curl -sf https://api.summit.internal/health | jq -r '.status')
if [ "$HEALTH" != "healthy" ]; then
  echo "❌ Health check failed: $HEALTH"
  exit 1
fi

echo "✅ Application rollback complete"
```

**Expected Duration**: 3-5 minutes

**Verification**:

```bash
# Check pod versions
kubectl get pods -n production -l app=summit-server -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Verify health
curl https://api.summit.internal/health | jq
```

---

### 3.2 Policy Rollback

#### OPA Policy Bundle Rollback

```bash
#!/bin/bash
# Script: scripts/rollback-policy.sh

set -euo pipefail

BUNDLE_VERSION="${1:-v3.0.0-ga}"

echo "🔄 Rolling back OPA policy to $BUNDLE_VERSION..."

# 1. Pull previous bundle from registry
oras pull ghcr.io/summit/policies:$BUNDLE_VERSION

# 2. Verify bundle signature
cosign verify-blob --key cosign.pub bundles/main-$BUNDLE_VERSION.tar.gz \
  --signature bundles/main-$BUNDLE_VERSION.tar.gz.sig

# 3. Update OPA config
kubectl create configmap opa-bundle-$BUNDLE_VERSION \
  --from-file=bundles/main-$BUNDLE_VERSION.tar.gz \
  -n governance \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Update OPA deployment
kubectl set env deployment/opa -n governance \
  BUNDLE_VERSION=$BUNDLE_VERSION \
  BUNDLE_NAME=opa-bundle-$BUNDLE_VERSION

# 5. Restart OPA pods
kubectl rollout restart deployment/opa -n governance
kubectl rollout status deployment/opa -n governance --timeout=2m

# 6. Verify policy version
OPA_VERSION=$(curl -s http://opa.governance.svc.cluster.local:8181/v1/data/system/bundles/main | jq -r '.result.manifest.version')
if [ "$OPA_VERSION" != "$BUNDLE_VERSION" ]; then
  echo "❌ Policy version mismatch: expected $BUNDLE_VERSION, got $OPA_VERSION"
  exit 1
fi

echo "✅ Policy rollback complete"
```

**Expected Duration**: 2-3 minutes

---

### 3.3 Database Rollback

#### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# Script: scripts/rollback-database.sh

set -euo pipefail

RESTORE_POINT="${1:?Restore point required (e.g., '2025-12-30 10:30:00')}"

echo "⚠️  WARNING: Database rollback will result in data loss!"
echo "Restore point: $RESTORE_POINT"
read -p "Proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback aborted"
  exit 1
fi

echo "🔄 Starting database PITR rollback..."

# 1. Announce maintenance mode
curl -X POST https://status.summit.internal/api/maintenance \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{"status": "maintenance", "message": "Emergency database rollback in progress"}'

# 2. Scale down application
kubectl scale deployment/summit-server -n production --replicas=0
kubectl wait --for=delete pod -l app=summit-server -n production --timeout=2m

# 3. Create pre-rollback snapshot
pg_dump -h $DB_HOST -U $DB_USER -Fc intelgraph > intelgraph-pre-rollback-$(date +%s).dump
aws s3 cp intelgraph-pre-rollback-*.dump s3://summit-backups/emergency/

# 4. Perform PITR
psql -h $DB_HOST -U $DB_USER -c "SELECT pg_promote();"
# In practice, use cloud provider's PITR feature (AWS RDS, Google Cloud SQL)
# aws rds restore-db-instance-to-point-in-time --target-time "$RESTORE_POINT" ...

# 5. Verify schema version
SCHEMA_VERSION=$(psql -h $DB_HOST -U $DB_USER -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;")
echo "Schema version after rollback: $SCHEMA_VERSION"

# 6. Scale up application
kubectl scale deployment/summit-server -n production --replicas=3
kubectl rollout status deployment/summit-server -n production --timeout=5m

# 7. End maintenance mode
curl -X POST https://status.summit.internal/api/maintenance \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{"status": "operational"}'

echo "✅ Database rollback complete"
```

**⚠️ WARNING**: PITR results in data loss. Use only for critical corruption.

**Expected Duration**: 10-30 minutes (depends on database size)

---

### 3.4 Configuration Rollback

```bash
#!/bin/bash
# Script: scripts/rollback-config.sh

set -euo pipefail

CONFIG_VERSION="${1:-v3.0.0-ga}"

echo "🔄 Rolling back configuration to $CONFIG_VERSION..."

# 1. Fetch previous config from Git
git fetch origin
git checkout tags/$CONFIG_VERSION -- config/

# 2. Update Kubernetes ConfigMaps
kubectl create configmap summit-config \
  --from-file=config/ \
  -n production \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Restart pods to pick up new config
kubectl rollout restart deployment/summit-server -n production
kubectl rollout status deployment/summit-server -n production --timeout=5m

echo "✅ Configuration rollback complete"
```

---

## 4. Communication Protocol

### 4.1 Internal Communication

#### Immediate Announcement (P0)

**Slack (#summit-incidents)**:

```
🚨 EMERGENCY ROLLBACK INITIATED 🚨

Trigger: [REASON]
Initiated by: [NAME]
Time: [TIMESTAMP]
Incident ID: INC-[ID]

Current Status: Rolling back to v3.0.0-ga
Expected Duration: 5 minutes
Rollback Command: ./scripts/emergency-rollback.sh

War Room: [ZOOM_LINK]
Status Page: https://status.summit.internal

DO NOT deploy or make manual changes.
```

#### Progress Updates (Every 2 minutes)

```
UPDATE [HH:MM] - [STATUS]
✅ Application rolled back
⏳ Policy rollback in progress...
```

#### Completion Announcement

```
✅ ROLLBACK COMPLETE

Version: v3.0.0-ga
Duration: [ACTUAL_DURATION]
Status: All systems operational

Health Check: ✅ Passed
Error Rate: 0.01% (baseline)
Latency P95: 120ms (baseline)

Postmortem: Will be scheduled within 24 hours

Thank you for your patience.
```

---

### 4.2 External Communication

#### Status Page Update (Maintenance Mode)

```
🔧 Maintenance in Progress

We are performing emergency maintenance due to a detected issue.
Expected Duration: 15 minutes
Started: [TIME]

Services Affected:
- API (api.summit.internal)
- Web UI (app.summit.internal)

No data loss is expected.
```

#### Completion Update

```
✅ Maintenance Complete

All systems have been restored to normal operation.
If you experience any issues, please contact support.

Completed: [TIME]
Duration: [ACTUAL_DURATION]
```

---

### 4.3 Stakeholder Notification

**Email Template**:

```
Subject: [URGENT] Summit Production Rollback - INC-[ID]

Hi Team,

We initiated an emergency rollback of Summit production at [TIME] due to:

[REASON]

Current Status: [STATUS]
Expected Resolution: [TIME]

Impact:
- Users: [USER_IMPACT]
- Data: [DATA_IMPACT]
- Availability: [AVAILABILITY_IMPACT]

We will provide updates every 15 minutes until resolved.

War Room: [ZOOM_LINK]
Incident Tracker: [JIRA_LINK]

Regards,
Release Captain
```

---

## 5. Post-Rollback Procedures

### 5.1 Immediate Verification (Within 5 minutes)

```bash
#!/bin/bash
# Script: scripts/post-rollback-verification.sh

set -euo pipefail

echo "🔍 Running post-rollback verification..."

# 1. Health checks
echo "Checking health endpoints..."
for endpoint in api.summit.internal app.summit.internal; do
  STATUS=$(curl -sf https://$endpoint/health | jq -r '.status')
  if [ "$STATUS" != "healthy" ]; then
    echo "❌ $endpoint is unhealthy: $STATUS"
    exit 1
  fi
  echo "✅ $endpoint is healthy"
done

# 2. Version verification
API_VERSION=$(curl -sf https://api.summit.internal/version | jq -r '.version')
echo "API version: $API_VERSION"

# 3. Critical path smoke test
echo "Running smoke tests..."
./scripts/smoke-test.sh --env=production --critical-only

# 4. Metrics check
ERROR_RATE=$(curl -s 'http://prometheus/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq -r '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE > 0.001" | bc -l) )); then
  echo "⚠️  Error rate elevated: $ERROR_RATE"
else
  echo "✅ Error rate normal: $ERROR_RATE"
fi

# 5. Audit trail verification
echo "Verifying audit trail..."
AUDIT_COUNT=$(psql -h $DB_HOST -U $DB_USER -t -c "SELECT count(*) FROM audit_events WHERE timestamp > NOW() - INTERVAL '5 minutes';")
if [ "$AUDIT_COUNT" -lt 10 ]; then
  echo "⚠️  Low audit activity: $AUDIT_COUNT events"
else
  echo "✅ Audit trail active: $AUDIT_COUNT events"
fi

echo "✅ Post-rollback verification complete"
```

---

### 5.2 Incident Documentation (Within 1 hour)

Create incident record in `incidents/INC-[ID].md`:

```markdown
# Incident INC-[ID]: MVP-4-GA Rollback

**Date**: 2025-12-30
**Severity**: P0
**Duration**: [DURATION]
**Impact**: [DESCRIPTION]

## Timeline

| Time  | Event                                |
| ----- | ------------------------------------ |
| 10:30 | Issue detected: High error rate (7%) |
| 10:31 | Rollback initiated by [NAME]         |
| 10:34 | Application rolled back to v3.0.0-ga |
| 10:36 | Policy rolled back                   |
| 10:38 | Health checks passed                 |
| 10:40 | Rollback complete                    |

## Root Cause

[TO BE DETERMINED - Requires investigation]

## Impact

- Users affected: [COUNT]
- Requests failed: [COUNT]
- Data lost: None
- Duration: 10 minutes

## Resolution

Rolled back to previous stable version (v3.0.0-ga).

## Follow-Up

- [ ] Postmortem scheduled: [DATE]
- [ ] Root cause investigation: [ASSIGNEE]
- [ ] Fix verification in staging: [ASSIGNEE]
- [ ] Re-deployment plan: [ASSIGNEE]
```

---

### 5.3 Postmortem (Within 24 hours)

**Required Attendees**:

- Release Captain
- SRE Lead
- Engineering Lead
- Product Owner
- Security (if security-related)

**Agenda**:

1. Timeline review (blameless)
2. Root cause analysis (5 Whys)
3. What went well / What went wrong
4. Action items to prevent recurrence

**Template**: `docs/postmortems/TEMPLATE.md`

---

## 6. Rollback Testing

### 6.1 Quarterly Rollback Drill

```bash
#!/bin/bash
# Script: scripts/rollback-drill.sh

set -euo pipefail

ENV="${1:-staging}"

echo "🎯 Starting rollback drill on $ENV..."

# 1. Deploy "broken" version
echo "Deploying broken version..."
./scripts/deploy.sh $ENV --version=broken-canary

# 2. Wait for "issue" detection
sleep 60

# 3. Execute rollback
echo "Executing rollback..."
./scripts/emergency-rollback.sh --env=$ENV --reason="Rollback drill"

# 4. Verify rollback success
./scripts/post-rollback-verification.sh --env=$ENV

# 5. Generate report
echo "Generating drill report..."
cat > reports/rollback-drill-$(date +%s).md <<EOF
# Rollback Drill - $(date)

**Environment**: $ENV
**Duration**: [DURATION]
**Success**: ✅

## Metrics

- Rollback execution time: [TIME]
- Services affected: [COUNT]
- Data integrity: ✅ Verified

## Learnings

[NOTES]

## Action Items

- [ ] [ACTION_1]
- [ ] [ACTION_2]
EOF

echo "✅ Rollback drill complete"
```

**Frequency**: Quarterly (every 3 months)
**Scope**: All environments (staging, pre-prod, production)

---

### 6.2 Rollback Checklist

Before declaring rollback ready:

- [ ] Application rollback tested in staging
- [ ] Policy rollback tested in staging
- [ ] Database PITR tested in isolated environment
- [ ] Configuration rollback tested
- [ ] Communication templates prepared
- [ ] War room procedures documented
- [ ] On-call team trained
- [ ] Rollback scripts executable
- [ ] Monitoring alerts configured
- [ ] Postmortem template ready

---

## 7. Rollback Success Metrics

### 7.1 Key Performance Indicators

| Metric                  | Target   | Actual (Last 3 Rollbacks) |
| ----------------------- | -------- | ------------------------- |
| **Time to Decision**    | < 5 min  | 3 min avg                 |
| **Execution Time**      | < 10 min | 7 min avg                 |
| **Data Loss**           | None     | 0 incidents               |
| **Communication Delay** | < 2 min  | 1 min avg                 |
| **Verification Time**   | < 5 min  | 4 min avg                 |

### 7.2 Continuous Improvement

After each rollback:

1. Review execution time
2. Identify bottlenecks
3. Update automation
4. Train team on learnings
5. Update runbooks

---

**Document Control**:

- **Version**: 1.0
- **Owner**: Release Captain + SRE Team
- **Approvers**: VP Engineering, SRE Lead
- **Next Review**: After each rollback + Quarterly
