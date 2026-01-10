# MVP-4-GA Canary Deployment Strategy

> **Version**: 1.0
> **Last Updated**: 2025-12-30
> **Status**: Production-Ready
> **Audience**: Release Engineers, SRE, DevOps

---

## Executive Summary

This document defines the **canary deployment strategy** for Summit MVP-4-GA. Canary deployments enable gradual, low-risk rollouts by exposing new versions to a small subset of traffic before full promotion.

**Canary Philosophy**: "Test in production, but safely. Fail fast, rollback faster."

---

## Table of Contents

1. [Canary Strategy Overview](#1-canary-strategy-overview)
2. [Canary Stages](#2-canary-stages)
3. [Traffic Splitting](#3-traffic-splitting)
4. [Success Metrics](#4-success-metrics)
5. [Automated Rollback](#5-automated-rollback)
6. [Manual Control](#6-manual-control)
7. [Monitoring & Alerting](#7-monitoring--alerting)

---

## 1. Canary Strategy Overview

### 1.1 Why Canary Deployments?

**Benefits**:
- ✅ **Risk Mitigation**: Limit blast radius to small % of users
- ✅ **Fast Feedback**: Detect issues before full rollout
- ✅ **Automated Rollback**: Revert automatically on failure
- ✅ **A/B Testing**: Compare old vs new version performance
- ✅ **Confidence**: Gradual promotion builds confidence

**Trade-offs**:
- ⏱️ **Slower Rollout**: Full deployment takes longer
- 🔧 **Complexity**: Requires traffic management infrastructure
- 📊 **Monitoring**: Requires per-version metrics

### 1.2 Canary Architecture

```
                    ┌─────────────────────────────────┐
                    │        Load Balancer            │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────┴─────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  Stable (v3.0.0-ga)   │       │  Canary (v4.0.0-ga)   │
        │  95% traffic          │       │  5% traffic           │
        │  ┌─────┐ ┌─────┐     │       │  ┌─────┐              │
        │  │Pod 1│ │Pod 2│     │       │  │Pod 1│              │
        │  └─────┘ └─────┘     │       │  └─────┘              │
        └───────────────────────┘       └───────────────────────┘
```

---

## 2. Canary Stages

### 2.1 Stage Progression

| Stage | Duration | Traffic % | Success Criteria | Auto-Promote? |
|-------|----------|-----------|------------------|---------------|
| **0. Pre-Canary** | N/A | 0% | All gates passed | No |
| **1. Internal** | 15 min | 0% (internal only) | No errors for 15 min | Yes |
| **2. Canary 5%** | 30 min | 5% | Error rate < 0.1%, latency < baseline | Yes |
| **3. Canary 25%** | 30 min | 25% | Error rate < 0.1%, latency < baseline | Yes |
| **4. Canary 50%** | 30 min | 50% | Error rate < 0.1%, latency < baseline | Yes |
| **5. Full Rollout** | 10 min | 100% | All metrics green | Manual |

**Total Duration**: ~2 hours (if all stages pass)

### 2.2 Stage 0: Pre-Canary Verification

```bash
#!/bin/bash
# Script: scripts/canary/pre-canary-check.sh

set -euo pipefail

VERSION="${1:?Version required}"

echo "🔍 Running pre-canary checks for $VERSION..."

# 1. Verify CI gates passed
gh run list --workflow=mvp4-gate.yml --branch=main --limit=1 | grep success
# Expected: success

# 2. Verify container images exist
for image in server client gateway; do
  docker pull ghcr.io/summit/$image:$VERSION
done

# 3. Verify SBOM and provenance
cosign verify ghcr.io/summit/server:$VERSION --key cosign.pub

# 4. Run smoke tests in staging
./scripts/smoke-test.sh --env=staging --version=$VERSION

# 5. Verify database migrations (dry run)
pnpm db:migrate --dry-run --env=staging

echo "✅ Pre-canary checks passed"
```

**Acceptance**: All checks must pass before canary deployment.

---

### 2.3 Stage 1: Internal Canary

**Goal**: Expose new version to internal users only (Summit team).

**Implementation**:
```yaml
# Kubernetes HTTPRoute (Gateway API)
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: summit-internal-canary
spec:
  parentRefs:
    - name: internal-gateway
  hostnames:
    - "internal.summit.internal"
  rules:
    - matches:
        - headers:
            - type: Exact
              name: X-Summit-Employee
              value: "true"
      backendRefs:
        - name: summit-server-canary
          port: 8080
          weight: 100  # 100% of internal traffic
```

**Verification**:
```bash
# Internal users test the new version
curl -H "X-Summit-Employee: true" https://internal.summit.internal/health
# Expected: {"version": "v4.0.0-ga"}
```

**Duration**: 15 minutes
**Success Criteria**:
- [ ] Zero errors from internal users
- [ ] No performance degradation
- [ ] All critical features functional

---

### 2.4 Stage 2: Canary 5%

**Goal**: Expose 5% of production traffic to new version.

**Implementation (Istio)**:
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: summit-server
spec:
  hosts:
    - api.summit.internal
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: summit-server
            subset: canary
          weight: 100
    - route:
        - destination:
            host: summit-server
            subset: stable
          weight: 95
        - destination:
            host: summit-server
            subset: canary
          weight: 5
```

**Deployment**:
```bash
#!/bin/bash
# Script: scripts/canary/deploy-canary-5.sh

set -euo pipefail

VERSION="${1:?Version required}"

echo "🚀 Deploying canary 5% for $VERSION..."

# 1. Deploy canary pods
helm upgrade summit-prod ./helm/summit \
  --namespace production \
  --set canary.enabled=true \
  --set canary.tag=$VERSION \
  --set canary.weight=5 \
  --wait

# 2. Verify canary pods healthy
kubectl wait --for=condition=Ready pod \
  -l app=summit-server,version=$VERSION \
  -n production \
  --timeout=2m

# 3. Start monitoring
./scripts/canary/monitor-canary.sh --version=$VERSION --duration=30m &

echo "✅ Canary 5% deployed"
```

**Duration**: 30 minutes

---

### 2.5 Stage 3-4: Progressive Rollout (25%, 50%)

**Progression**:
```bash
#!/bin/bash
# Script: scripts/canary/progressive-rollout.sh

set -euo pipefail

VERSION="${1:?Version required}"
STAGES=(5 25 50)

for WEIGHT in "${STAGES[@]}"; do
  echo "📊 Canary $WEIGHT%: Deploying..."

  # Update traffic split
  helm upgrade summit-prod ./helm/summit \
    --namespace production \
    --set canary.weight=$WEIGHT \
    --reuse-values \
    --wait

  # Monitor for stage duration
  echo "Monitoring for 30 minutes..."
  if ! ./scripts/canary/monitor-canary.sh --version=$VERSION --duration=30m --weight=$WEIGHT; then
    echo "❌ Canary failed at $WEIGHT%. Rolling back..."
    ./scripts/canary/rollback-canary.sh --version=$VERSION
    exit 1
  fi

  echo "✅ Canary $WEIGHT%: Success"
done

echo "🎉 Progressive rollout complete. Ready for full promotion."
```

---

### 2.6 Stage 5: Full Promotion

**Goal**: Migrate 100% traffic to new version.

```bash
#!/bin/bash
# Script: scripts/canary/promote-full.sh

set -euo pipefail

VERSION="${1:?Version required}"

echo "🎯 Promoting $VERSION to 100%..."

# 1. Final verification
./scripts/canary/final-verification.sh --version=$VERSION

# 2. Promote to 100%
helm upgrade summit-prod ./helm/summit \
  --namespace production \
  --set image.tag=$VERSION \
  --set canary.enabled=false \
  --wait

# 3. Scale down old version
kubectl scale deployment summit-server-stable -n production --replicas=0

# 4. Verify
kubectl get pods -n production -l app=summit-server

echo "✅ Full promotion complete"
```

**Acceptance**: Manual approval required by Release Captain.

---

## 3. Traffic Splitting

### 3.1 Traffic Management (Istio)

**DestinationRule**:
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: summit-server
spec:
  host: summit-server
  subsets:
    - name: stable
      labels:
        version: v3.0.0-ga
    - name: canary
      labels:
        version: v4.0.0-ga
```

**VirtualService** (Dynamic Weight):
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: summit-server
spec:
  hosts:
    - api.summit.internal
  http:
    - route:
        - destination:
            host: summit-server
            subset: stable
          weight: 95
        - destination:
            host: summit-server
            subset: canary
          weight: 5
```

### 3.2 User-Based Canary (Opt-In)

```yaml
# VirtualService with header-based routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: summit-server-opt-in
spec:
  hosts:
    - api.summit.internal
  http:
    - match:
        - headers:
            x-canary-opt-in:
              exact: "true"
      route:
        - destination:
            host: summit-server
            subset: canary
    - route:
        - destination:
            host: summit-server
            subset: stable
```

**Usage**:
```bash
# User opts into canary
curl -H "X-Canary-Opt-In: true" https://api.summit.internal/entities
```

---

## 4. Success Metrics

### 4.1 Automated Success Criteria

```yaml
# Flagger CanaryAnalysis
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: summit-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: summit-server
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5  # Allow 5 consecutive failures
    maxWeight: 50
    stepWeight: 5

    metrics:
      # Error rate < 0.5%
      - name: error-rate
        thresholdRange:
          max: 0.5
        interval: 1m
        query: |
          100 - sum(rate(http_requests_total{status!~"5.."}[1m]))
          /
          sum(rate(http_requests_total[1m])) * 100

      # Latency P95 < 200ms
      - name: latency-p95
        thresholdRange:
          max: 0.2
        interval: 1m
        query: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[1m])) by (le)
          )

      # Request success rate > 99.5%
      - name: success-rate
        thresholdRange:
          min: 99.5
        interval: 1m
        query: |
          sum(rate(http_requests_total{status=~"2.."}[1m]))
          /
          sum(rate(http_requests_total[1m])) * 100
```

### 4.2 Business Metrics

```promql
# Policy evaluation success rate
sum(rate(policy_evaluations_total{decision!="ERROR"}[5m]))
/ sum(rate(policy_evaluations_total[5m])) * 100
# Threshold: > 99%

# Audit trail coverage
sum(rate(audit_events_total[5m]))
/ sum(rate(policy_evaluations_total[5m]))
# Threshold: >= 100% (every decision logged)

# User session success
sum(rate(user_sessions_created_total[5m]))
- sum(rate(user_sessions_failed_total[5m]))
# Threshold: >= 95%
```

---

## 5. Automated Rollback

### 5.1 Rollback Triggers

```yaml
# Flagger automatic rollback
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: summit-server
spec:
  analysis:
    webhooks:
      - name: rollback-hook
        type: rollback
        url: http://rollback-service/rollback
        timeout: 5s
        metadata:
          reason: "Automated canary rollback"

      - name: acceptance-test
        type: pre-rollout
        url: http://test-service/validate
        timeout: 30s

      - name: load-test
        type: rollout
        url: http://load-test-service/run
        timeout: 5m
```

### 5.2 Rollback Script

```bash
#!/bin/bash
# Script: scripts/canary/rollback-canary.sh

set -euo pipefail

VERSION="${1:?Version required}"
REASON="${2:-Automated rollback due to metrics threshold breach}"

echo "🔴 Rolling back canary $VERSION..."
echo "Reason: $REASON"

# 1. Set traffic to 0% for canary
helm upgrade summit-prod ./helm/summit \
  --namespace production \
  --set canary.weight=0 \
  --reuse-values \
  --wait

# 2. Delete canary pods
kubectl delete pods -n production -l app=summit-server,version=$VERSION

# 3. Notify team
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -d "{
    \"channel\": \"#summit-releases\",
    \"text\": \"🔴 Canary rollback: $VERSION\n Reason: $REASON\"
  }"

# 4. Create incident
./scripts/incident/create.sh \
  --severity=P1 \
  --title="Canary rollback: $VERSION" \
  --description="$REASON"

echo "✅ Canary rolled back successfully"
```

**Execution Time**: < 2 minutes

---

## 6. Manual Control

### 6.1 Manual Promotion

```bash
# Manually promote to next stage
./scripts/canary/promote.sh --version=v4.0.0-ga --weight=25
```

### 6.2 Manual Pause

```bash
# Pause canary at current stage
./scripts/canary/pause.sh --version=v4.0.0-ga
```

### 6.3 Manual Rollback

```bash
# Emergency rollback
./scripts/canary/rollback-canary.sh --version=v4.0.0-ga --reason="Manual rollback by Release Captain"
```

---

## 7. Monitoring & Alerting

### 7.1 Canary Dashboard

**Grafana Dashboard**: `https://grafana.summit.internal/d/canary`

**Panels**:
1. **Traffic Distribution** (Gauge)
   - Stable vs Canary traffic %

2. **Error Rate Comparison** (Graph)
   - Stable vs Canary error rates

3. **Latency Comparison** (Graph)
   - Stable vs Canary P50/P95/P99

4. **Request Volume** (Graph)
   - Requests/sec per version

5. **Canary Health** (Table)
   - Pod status, version, ready state

### 7.2 Canary Alerts

```yaml
# Prometheus AlertRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: canary-alerts
spec:
  groups:
    - name: canary
      interval: 30s
      rules:
        - alert: CanaryHighErrorRate
          expr: |
            sum(rate(http_requests_total{version="v4.0.0-ga",status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{version="v4.0.0-ga"}[5m]))
            > 0.005
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Canary error rate > 0.5%"
            description: "Version {{ $labels.version }} error rate: {{ $value }}%"

        - alert: CanaryLatencyDegradation
          expr: |
            histogram_quantile(0.95,
              sum(rate(http_request_duration_seconds_bucket{version="v4.0.0-ga"}[5m])) by (le)
            )
            >
            histogram_quantile(0.95,
              sum(rate(http_request_duration_seconds_bucket{version="v3.0.0-ga"}[5m])) by (le)
            ) * 1.2  # 20% worse than stable
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Canary latency degraded"
            description: "Canary P95 latency 20% higher than stable"
```

---

## 8. Canary Checklist

### 8.1 Pre-Deployment

- [ ] Pre-canary checks passed
- [ ] Rollback script tested
- [ ] Monitoring dashboards configured
- [ ] Alerts configured
- [ ] On-call team notified
- [ ] Staging canary successful

### 8.2 During Canary

- [ ] Internal canary (15 min) ✅
- [ ] Canary 5% (30 min) ✅
- [ ] Canary 25% (30 min) ✅
- [ ] Canary 50% (30 min) ✅
- [ ] All metrics green
- [ ] No user-reported issues

### 8.3 Post-Promotion

- [ ] Full rollout complete
- [ ] Old version scaled down
- [ ] Canary config removed
- [ ] Team notified
- [ ] Documentation updated

---

**Document Control**:
- **Version**: 1.0
- **Owner**: Release Engineering Team
- **Approvers**: SRE Lead, Release Captain
- **Next Review**: After each canary deployment
