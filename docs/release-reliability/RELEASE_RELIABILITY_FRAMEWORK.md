# CompanyOS Release Reliability Framework

> **Version**: 0.1.0
> **Last Updated**: 2025-12-06
> **Owner**: Reliability & Release Team
> **Status**: Active

## Executive Summary

This document establishes the release and runtime reliability framework for CompanyOS. The goal is to make safe, frequent releases the default path—not a heroic effort. Every deployment should be auditable, reversible, and guarded by policy.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Service Classification](#service-classification)
3. [Deployment Strategies](#deployment-strategies)
4. [Release Gates](#release-gates)
5. [Runtime Safeguards](#runtime-safeguards)
6. [Error Budget Management](#error-budget-management)
7. [Rollback Procedures](#rollback-procedures)
8. [Exception Handling](#exception-handling)

---

## Core Principles

### 1. Safe by Default
Every deployment follows the safe path unless explicitly overridden with audit trail.

### 2. Observable Always
No change goes to production without metrics, logs, and traces in place.

### 3. Reversible Immediately
Every deployment can be rolled back within 5 minutes.

### 4. Policy-Enforced
OPA policies gate all promotions—no exceptions without documented override.

### 5. Budget-Aware
Error budgets drive deployment velocity—burn rate determines risk appetite.

---

## Service Classification

Services are classified into tiers that determine deployment strategy and release gates.

### Tier 1: Critical Path

**Definition**: Services directly in the golden path (Investigation → Entities → Relationships → Copilot → Results)

| Service | Impact | SLO Target | Deployment Strategy |
|---------|--------|------------|---------------------|
| `api` | User-facing API | 99.9% availability, p95 < 500ms | Progressive canary |
| `graphql-gateway` | Query federation | 99.9% availability | Progressive canary |
| `neo4j` | Graph storage | 99.99% durability | Blue-green |
| `copilot` | AI assistance | 99.5% availability | Canary with shadow |

### Tier 2: Supporting Services

**Definition**: Services that support but don't directly block the golden path

| Service | Impact | SLO Target | Deployment Strategy |
|---------|--------|------------|---------------------|
| `conductor` | Orchestration | 99.5% availability | Standard canary |
| `audit-svc` | Audit logging | 99.9% durability | Rolling update |
| `prov-ledger` | Provenance | 99.5% availability | Rolling update |
| `worker-*` | Background jobs | 95% completion rate | Rolling update |

### Tier 3: Internal Services

**Definition**: Internal tooling and non-customer-facing services

| Service | Impact | SLO Target | Deployment Strategy |
|---------|--------|------------|---------------------|
| `devtools` | Developer productivity | 95% availability | Direct deploy |
| `docs-*` | Documentation | Best effort | Direct deploy |
| `sandbox` | Testing environments | Best effort | Direct deploy |

---

## Deployment Strategies

### Strategy Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT STRATEGY MATRIX                        │
├─────────────────┬──────────────────────────────────────────────────┤
│ Strategy        │ Use When                                          │
├─────────────────┼──────────────────────────────────────────────────┤
│ Progressive     │ Tier 1 services, database-backed changes         │
│ Canary          │ Risk: HIGH | Rollback: <2min | Blast radius: 10% │
├─────────────────┼──────────────────────────────────────────────────┤
│ Standard        │ Tier 2 services, configuration changes           │
│ Canary          │ Risk: MEDIUM | Rollback: <5min | Blast radius: 20%│
├─────────────────┼──────────────────────────────────────────────────┤
│ Blue-Green      │ Stateful services, database migrations           │
│                 │ Risk: LOW | Rollback: instant | Blast radius: 0%  │
├─────────────────┼──────────────────────────────────────────────────┤
│ Rolling         │ Tier 3 services, stateless workers               │
│ Update          │ Risk: LOW | Rollback: <10min | Blast radius: 25% │
├─────────────────┼──────────────────────────────────────────────────┤
│ Feature         │ Experimental features, A/B tests                 │
│ Flags           │ Risk: MINIMAL | Rollback: instant | User-targeted│
└─────────────────┴──────────────────────────────────────────────────┘
```

### Progressive Canary (Tier 1)

For critical path services with SLO-driven promotion.

```yaml
# Argo Rollouts Progressive Canary Configuration
strategy:
  canary:
    steps:
      # Phase 1: Smoke test (1% traffic)
      - setWeight: 1
      - pause: { duration: 60 }
      - analysis:
          templates: [smoke-check]

      # Phase 2: Canary expansion (10% traffic)
      - setWeight: 10
      - pause: { duration: 300 }
      - analysis:
          templates: [slo-burn-check, error-budget-check]

      # Phase 3: Broad validation (25% traffic)
      - setWeight: 25
      - pause: { duration: 600 }
      - analysis:
          templates: [slo-burn-check, synthetic-check]

      # Phase 4: Majority traffic (50% traffic)
      - setWeight: 50
      - pause: { duration: 900 }
      - analysis:
          templates: [slo-burn-check, anomaly-check]

      # Phase 5: Full rollout (100% traffic)
      - setWeight: 100

    # Auto-rollback on analysis failure
    analysis:
      failureLimit: 1
      successCondition: result.status == "Successful"
```

**Traffic Progression Timeline**:
```
Time:     0    1m    6m    16m    31m    Complete
Traffic:  1%   10%   25%   50%    100%
          │     │     │     │      │
          ▼     ▼     ▼     ▼      ▼
        Smoke  SLO   SLO   SLO   Final
        Check  Burn  Burn  Burn  Validation
```

### Standard Canary (Tier 2)

For supporting services with faster promotion.

```yaml
strategy:
  canary:
    steps:
      - setWeight: 10
      - pause: { duration: 120 }
      - analysis:
          templates: [quick-health-check]
      - setWeight: 50
      - pause: { duration: 180 }
      - analysis:
          templates: [slo-burn-check]
      - setWeight: 100
```

### Blue-Green (Stateful Services)

For database migrations and stateful service updates.

```yaml
strategy:
  blueGreen:
    activeService: api-active
    previewService: api-preview
    autoPromotionEnabled: false
    prePromotionAnalysis:
      templates: [migration-validation, data-integrity-check]
    postPromotionAnalysis:
      templates: [smoke-check, slo-check]
    scaleDownDelaySeconds: 300  # Keep old pods for 5 minutes
```

**Blue-Green Workflow**:
```
┌────────────────────────────────────────────────────────────────┐
│  1. Deploy Green Environment (preview)                         │
│     └─> Run pre-promotion analysis                             │
│                                                                │
│  2. Validate Green Environment                                 │
│     └─> Migration checks, smoke tests, synthetic probes        │
│                                                                │
│  3. Switch Traffic (atomic)                                    │
│     └─> Update active service selector                         │
│                                                                │
│  4. Post-Promotion Validation                                  │
│     └─> SLO checks, error rate monitoring                      │
│                                                                │
│  5. Keep Blue (old) for Rollback Window                        │
│     └─> 5-minute delay before scale-down                       │
└────────────────────────────────────────────────────────────────┘
```

### Feature Flags

For gradual feature exposure with instant rollback.

```typescript
// Feature flag configuration
const featureConfig = {
  name: 'new-search-algorithm',
  rollout: {
    type: 'percentage',
    percentage: 5,
    sticky: true,  // Consistent experience per user
  },
  targeting: {
    allowList: ['beta-testers', 'internal-users'],
    rules: [
      { attribute: 'plan', operator: 'in', values: ['enterprise'] }
    ]
  },
  metrics: {
    track: ['search_latency_p95', 'search_relevance_score'],
    successCriteria: {
      'search_latency_p95': { operator: 'lt', value: 200 },
      'search_relevance_score': { operator: 'gt', value: 0.85 }
    }
  },
  killSwitch: {
    errorThreshold: 0.05,  // 5% error rate triggers kill
    latencyThreshold: 500   // 500ms p95 triggers kill
  }
};
```

---

## Release Gates

### Gate Hierarchy

All releases must pass gates in order. Each gate is enforced by OPA policy.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RELEASE GATE FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │   BUILD     │───▶│   QUALITY   │───▶│  SECURITY   │              │
│  │   GATES     │    │   GATES     │    │   GATES     │              │
│  └─────────────┘    └─────────────┘    └─────────────┘              │
│        │                  │                  │                       │
│        ▼                  ▼                  ▼                       │
│  • TypeScript OK    • Tests pass      • 0 Critical CVEs             │
│  • Build success    • Coverage ≥80%   • 0 High CVEs (prod)          │
│  • Lint pass        • E2E green       • Secrets scan clean          │
│  • Type check OK    • Golden path OK  • SLSA level ≥3               │
│                                        • Image signed               │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │    SLO      │───▶│   POLICY    │───▶│  APPROVAL   │              │
│  │   GATES     │    │   GATES     │    │   GATES     │              │
│  └─────────────┘    └─────────────┘    └─────────────┘              │
│        │                  │                  │                       │
│        ▼                  ▼                  ▼                       │
│  • Error budget OK  • OPA allow       • Release Captain OK          │
│  • No active P1s    • ABAC validated  • Change window OK            │
│  • Burn rate <50%   • Registry trust  • Deployment freeze check     │
│                     • Vuln exceptions │                              │
│                       reviewed        │                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Gate 1: Build Gates

```yaml
# .github/workflows/gates/build.yml
build_gates:
  typescript:
    command: pnpm typecheck
    required: true

  build:
    command: pnpm build
    required: true

  lint:
    command: pnpm lint
    required: true

  format:
    command: pnpm format:check
    required: true
```

### Gate 2: Quality Gates

```yaml
quality_gates:
  unit_tests:
    command: pnpm test:jest
    coverage_threshold: 80
    required: true

  integration_tests:
    command: pnpm test:integration
    required: true

  e2e_tests:
    command: pnpm e2e
    required: true
    conditions:
      - high_risk_files_changed
      - api_changes

  golden_path:
    command: make smoke
    required: true
```

### Gate 3: Security Gates

```yaml
security_gates:
  vulnerability_scan:
    tool: trivy
    fail_on: [critical]
    warn_on: [high]
    production_fail_on: [critical, high]

  secret_scan:
    tool: gitleaks
    fail_on: any_secret

  dependency_review:
    tool: npm audit
    fail_on: critical

  sast:
    tool: codeql
    languages: [javascript, typescript, python]

  container_signing:
    tool: cosign
    required: true

  slsa_attestation:
    minimum_level: 3
    required: true
```

### Gate 4: SLO Gates

```yaml
slo_gates:
  error_budget:
    check: error_budget_remaining > 20%
    override: requires_sre_approval

  burn_rate:
    fast_burn_threshold: 2.0   # 2x burn rate
    slow_burn_threshold: 1.0   # 1x burn rate
    block_on: fast_burn > threshold

  active_incidents:
    block_on: p1_incident_active
    override: emergency_hotfix

  recent_rollbacks:
    window: 24h
    threshold: 2
    block_on: rollbacks >= threshold
```

### Gate 5: Policy Gates (OPA)

```rego
# policies/release_gate.rego
package companyos.release

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := false

# Main decision
allow if {
    all_build_gates_pass
    all_quality_gates_pass
    all_security_gates_pass
    all_slo_gates_pass
    deployment_window_open
    not deployment_freeze_active
}

# Allow with emergency override
allow if {
    input.emergency_override == true
    input.override_approver in data.authorized_overriders
    input.incident_id != ""
}

# Build gates
all_build_gates_pass if {
    input.gates.build.typescript == "pass"
    input.gates.build.compile == "pass"
    input.gates.build.lint == "pass"
}

# Quality gates
all_quality_gates_pass if {
    input.gates.quality.unit_tests == "pass"
    input.gates.quality.coverage >= 80
    input.gates.quality.golden_path == "pass"
}

# Security gates
all_security_gates_pass if {
    input.gates.security.critical_cves == 0
    input.gates.security.secrets_found == 0
    input.gates.security.slsa_level >= 3
    input.gates.security.image_signed == true
}

# SLO gates
all_slo_gates_pass if {
    input.slo.error_budget_remaining >= 20
    input.slo.burn_rate < 2.0
    input.slo.active_p1_incidents == 0
}

# Change windows
deployment_window_open if {
    current_hour := time.clock(time.now_ns())[0]
    current_day := time.weekday(time.now_ns())

    # Weekdays 09:00-16:00 (avoid EOD)
    current_day in ["Monday", "Tuesday", "Wednesday", "Thursday"]
    current_hour >= 9
    current_hour < 16
}

deployment_window_open if {
    # Emergency always allowed
    input.emergency_override == true
}

# Freeze check
deployment_freeze_active if {
    some freeze in data.active_freezes
    time.now_ns() >= freeze.start_ns
    time.now_ns() < freeze.end_ns
    not input.emergency_override
}

# Generate decision record
decision := {
    "allow": allow,
    "timestamp": time.now_ns(),
    "service": input.service,
    "version": input.version,
    "gates": {
        "build": all_build_gates_pass,
        "quality": all_quality_gates_pass,
        "security": all_security_gates_pass,
        "slo": all_slo_gates_pass,
    },
    "overrides": {
        "emergency": input.emergency_override,
        "approver": input.override_approver,
    },
    "violations": violation,
}

# Violation messages
violation contains msg if {
    not all_build_gates_pass
    msg := "Build gates not satisfied"
}

violation contains msg if {
    not all_quality_gates_pass
    msg := sprintf("Quality gates failed (coverage: %d%%)", [input.gates.quality.coverage])
}

violation contains msg if {
    input.gates.security.critical_cves > 0
    msg := sprintf("%d critical CVEs detected", [input.gates.security.critical_cves])
}

violation contains msg if {
    input.slo.error_budget_remaining < 20
    msg := sprintf("Error budget exhausted (%d%% remaining)", [input.slo.error_budget_remaining])
}

violation contains msg if {
    not deployment_window_open
    not input.emergency_override
    msg := "Outside deployment window (Mon-Thu 09:00-16:00)"
}
```

### Gate 6: Approval Gates

```yaml
approval_gates:
  release_captain:
    required: true
    chatops_command: /merge-pr

  change_window:
    allowed_days: [monday, tuesday, wednesday, thursday]
    allowed_hours: [9, 16]  # 09:00-16:00 local
    override: emergency_hotfix

  freeze_check:
    source: deployment_freezes.yaml
    override: requires_vp_approval
```

---

## Runtime Safeguards

### Automated Rollback Triggers

```yaml
# k8s/argo/analysis-templates/slo-guard.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: slo-guard
spec:
  args:
    - name: service
    - name: namespace
  metrics:
    # Error rate check (2% threshold)
    - name: error-rate
      interval: 30s
      count: 10
      successCondition: result < 0.02
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{
              service="{{args.service}}",
              namespace="{{args.namespace}}",
              code=~"5.."
            }[2m]))
            /
            sum(rate(http_requests_total{
              service="{{args.service}}",
              namespace="{{args.namespace}}"
            }[2m]))

    # Latency check (p95 < 500ms)
    - name: latency-p95
      interval: 30s
      count: 10
      successCondition: result < 0.5
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            histogram_quantile(0.95,
              sum(rate(http_request_duration_seconds_bucket{
                service="{{args.service}}",
                namespace="{{args.namespace}}"
              }[2m])) by (le)
            )

    # Saturation check (CPU < 80%)
    - name: cpu-saturation
      interval: 30s
      count: 5
      successCondition: result < 0.8
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            avg(rate(container_cpu_usage_seconds_total{
              pod=~"{{args.service}}-.*",
              namespace="{{args.namespace}}"
            }[2m]))
            /
            avg(kube_pod_container_resource_limits{
              pod=~"{{args.service}}-.*",
              namespace="{{args.namespace}}",
              resource="cpu"
            })
```

### Synthetic Monitoring

Post-deploy synthetic checks validate the golden path:

```yaml
# k8s/monitoring/synthetic-checks.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: golden-path-synthetic
spec:
  schedule: "*/2 * * * *"  # Every 2 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: synthetic-runner
              image: ghcr.io/brianclong/summit/synthetic-runner:latest
              env:
                - name: TARGET_URL
                  value: "http://api.intelgraph.svc:4000"
              command:
                - /bin/sh
                - -c
                - |
                  # Health check
                  curl -sf ${TARGET_URL}/health || exit 1

                  # GraphQL introspection
                  curl -sf -X POST ${TARGET_URL}/graphql \
                    -H "Content-Type: application/json" \
                    -d '{"query":"{ __typename }"}' || exit 1

                  # Golden path smoke test
                  node /app/golden-path-test.js || exit 1

                  echo "Synthetic check passed"
          restartPolicy: OnFailure
```

### Anomaly Detection

ML-based anomaly detection for deployment safety:

```yaml
# observability/prometheus/alerts/anomaly-detection.yaml
groups:
  - name: deployment-anomaly
    rules:
      # Sudden error rate increase
      - alert: ErrorRateAnomaly
        expr: |
          (
            sum(rate(http_requests_total{code=~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
          ) >
          (
            avg_over_time(
              (sum(rate(http_requests_total{code=~"5.."}[5m])) by (service)
              /
              sum(rate(http_requests_total[5m])) by (service))[1h:]
            ) * 3  # 3x standard deviation
          )
        for: 2m
        labels:
          severity: warning
          action: investigate
        annotations:
          summary: "Error rate anomaly detected for {{ $labels.service }}"
          runbook: "docs/RUNBOOKS/observability/error-rate-spike.md"

      # Latency spike detection
      - alert: LatencyAnomaly
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) >
          (
            avg_over_time(
              histogram_quantile(0.95,
                sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
              )[1h:]
            ) * 2
          )
        for: 3m
        labels:
          severity: warning
          action: investigate
        annotations:
          summary: "Latency anomaly detected for {{ $labels.service }}"
```

### Chaos-Lite Probes

Resilience testing during canary phase:

```yaml
# k8s/chaos/canary-resilience-probe.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: resilience-probe
spec:
  args:
    - name: service
    - name: namespace
  metrics:
    # Verify circuit breaker activates
    - name: circuit-breaker-test
      interval: 60s
      count: 1
      successCondition: result == 1
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: chaos-probe
                    image: ghcr.io/brianclong/summit/chaos-probe:latest
                    command:
                      - /bin/sh
                      - -c
                      - |
                        # Inject latency to dependency
                        kubectl annotate pod -l app={{args.service}} \
                          chaos.io/latency-injection="500ms" || true

                        # Verify service degrades gracefully
                        sleep 10

                        # Check circuit breaker state
                        curl -sf http://{{args.service}}.{{args.namespace}}:4000/health/detailed \
                          | jq -e '.circuitBreakers | all(.state == "half-open" or .state == "closed")'

                        # Clean up
                        kubectl annotate pod -l app={{args.service}} \
                          chaos.io/latency-injection- || true
                restartPolicy: Never
```

---

## Error Budget Management

### Error Budget Calculation

```yaml
# Error budget policy
error_budget:
  window: 30d

  slo_targets:
    api:
      availability: 99.9  # 43.2 minutes/month downtime budget
      latency_p95: 99.0   # 1% requests can exceed 500ms

    graphql-gateway:
      availability: 99.9
      latency_p95: 99.0

    copilot:
      availability: 99.5  # 3.6 hours/month downtime budget
      latency_p95: 95.0   # AI responses can be slower

  burn_rate_thresholds:
    critical: 14.4   # Budget exhausted in 2 hours
    warning: 6.0     # Budget exhausted in 5 hours
    elevated: 1.0    # Budget exhausted in 30 days
```

### Budget-Driven Deployment Policy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR BUDGET DEPLOYMENT POLICY                    │
├───────────────────┬─────────────────────────────────────────────────┤
│ Budget Remaining  │ Policy                                           │
├───────────────────┼─────────────────────────────────────────────────┤
│ > 50%            │ Normal deployments allowed                       │
│                  │ • All strategies available                       │
│                  │ • Canary steps can be accelerated                │
├───────────────────┼─────────────────────────────────────────────────┤
│ 20% - 50%        │ Cautious deployments                             │
│                  │ • Canary required for Tier 1                     │
│                  │ • Extended observation periods                   │
│                  │ • SRE notification required                      │
├───────────────────┼─────────────────────────────────────────────────┤
│ < 20%            │ Budget protected mode                            │
│                  │ • Only bug fixes and rollbacks                   │
│                  │ • SRE approval required                          │
│                  │ • No new features deployed                       │
├───────────────────┼─────────────────────────────────────────────────┤
│ Exhausted        │ Deployment freeze                                │
│                  │ • Emergency fixes only                           │
│                  │ • VP approval required                           │
│                  │ • Mandatory blameless postmortem                 │
└───────────────────┴─────────────────────────────────────────────────┘
```

### Recording Rules for Budget Tracking

```yaml
# observability/prometheus/recording-rules/error-budget.yaml
groups:
  - name: error_budget_recording
    interval: 1m
    rules:
      # Error budget remaining (percentage)
      - record: slo:error_budget_remaining:ratio
        expr: |
          1 - (
            (
              1 - (sum(rate(http_requests_total{code!~"5.."}[30d])) by (service)
                   / sum(rate(http_requests_total[30d])) by (service))
            )
            /
            (1 - 0.999)  # SLO target 99.9%
          )
        labels:
          slo_type: availability

      # Fast burn rate (2-hour consumption rate)
      - record: slo:error_budget_burn_rate:fast
        expr: |
          sum(rate(http_requests_total{code=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service)
          /
          (1 - 0.999)  # Normalized to SLO

      # Slow burn rate (6-hour consumption rate)
      - record: slo:error_budget_burn_rate:slow
        expr: |
          sum(rate(http_requests_total{code=~"5.."}[1h])) by (service)
          /
          sum(rate(http_requests_total[1h])) by (service)
          /
          (1 - 0.999)
```

---

## Rollback Procedures

### Automated Rollback Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTOMATED ROLLBACK FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  │   DETECT    │────▶│   DECIDE    │────▶│   EXECUTE   │            │
│  └─────────────┘     └─────────────┘     └─────────────┘            │
│        │                   │                   │                     │
│        ▼                   ▼                   ▼                     │
│  • SLO violation     • Check rollback    • Abort canary             │
│  • Error spike         policy            • Revert traffic           │
│  • Health fail       • Verify budget     • Scale stable             │
│  • Synthetic fail    • Get approval if   • Notify stakeholders      │
│                        required                                      │
│                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  │   VERIFY    │────▶│   NOTIFY    │────▶│  DOCUMENT   │            │
│  └─────────────┘     └─────────────┘     └─────────────┘            │
│        │                   │                   │                     │
│        ▼                   ▼                   ▼                     │
│  • Health checks     • Slack alert       • Audit log                │
│  • SLO recovery      • PagerDuty         • Create incident          │
│  • Traffic normal    • GitHub issue      • Evidence capture         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Rollback Script

```bash
#!/usr/bin/env bash
# scripts/release/auto-rollback.sh

set -euo pipefail

SERVICE="${1:?Service name required}"
NAMESPACE="${2:-production}"
REASON="${3:-Automated rollback triggered}"
ACTOR="${ACTOR:-auto-controller}"

# Audit log
log_rollback() {
  local status="$1"
  jq -n \
    --arg ts "$(date -Iseconds)" \
    --arg service "$SERVICE" \
    --arg namespace "$NAMESPACE" \
    --arg reason "$REASON" \
    --arg actor "$ACTOR" \
    --arg status "$status" \
    '{timestamp:$ts, service:$service, namespace:$namespace,
      reason:$reason, actor:$actor, status:$status}' \
    >> /var/log/rollbacks/audit.jsonl
}

# Step 1: Abort any active rollout
echo "Aborting active rollout for $SERVICE..."
kubectl argo rollouts abort "$SERVICE" -n "$NAMESPACE" || true

# Step 2: Rollback to previous stable
echo "Rolling back to previous revision..."
kubectl argo rollouts undo "$SERVICE" -n "$NAMESPACE"

# Step 3: Wait for rollback completion
echo "Waiting for rollback to complete..."
kubectl argo rollouts status "$SERVICE" -n "$NAMESPACE" --timeout=300s

# Step 4: Verify health
echo "Verifying service health..."
for i in {1..10}; do
  if curl -sf "http://${SERVICE}.${NAMESPACE}:4000/health" >/dev/null; then
    echo "Health check passed"
    break
  fi
  sleep 5
done

# Step 5: Log and notify
log_rollback "success"

# Create GitHub issue for tracking
gh issue create \
  --title "Rollback: $SERVICE in $NAMESPACE" \
  --body "## Rollback Details

**Service**: $SERVICE
**Namespace**: $NAMESPACE
**Reason**: $REASON
**Actor**: $ACTOR
**Time**: $(date -Iseconds)

## Action Required
1. Investigate root cause
2. Fix and re-deploy when ready
3. Update this issue with findings

/cc @sre-team @platform-team" \
  --label "rollback,incident,needs-investigation"

echo "Rollback completed successfully"
```

### Manual Rollback Playbook

For cases requiring human judgment:

1. **Assess the situation**
   ```bash
   # Check current rollout status
   kubectl argo rollouts status <service> -n production

   # Review recent logs
   kubectl logs -l app=<service> -n production --since=5m | tail -100

   # Check error rates
   curl -s 'http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{service="<service>",code=~"5.."}[5m]))'
   ```

2. **Decide rollback scope**
   - Single service: Use `kubectl argo rollouts undo`
   - Multiple services: Coordinate with Release Captain
   - Database migration: Follow blue-green rollback procedure

3. **Execute rollback**
   ```bash
   # Abort current rollout
   kubectl argo rollouts abort <service> -n production

   # Rollback to specific revision (optional)
   kubectl argo rollouts undo <service> -n production --to-revision=<N>

   # Or use helm
   helm rollback <release> <revision> --cleanup-on-fail
   ```

4. **Verify and document**
   ```bash
   # Wait for rollback
   kubectl argo rollouts status <service> -n production

   # Verify health
   curl -sf http://<service>:4000/health

   # Document in incident tracker
   ```

---

## Exception Handling

### Override Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                       EXCEPTION REQUEST FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. JUSTIFY                                                          │
│     └─> Document reason, impact, and mitigation                     │
│                                                                      │
│  2. APPROVE                                                          │
│     └─> Get required approvals based on exception type              │
│                                                                      │
│  3. AUDIT                                                            │
│     └─> Log exception with full context                             │
│                                                                      │
│  4. EXECUTE                                                          │
│     └─> Proceed with override flag                                  │
│                                                                      │
│  5. REVIEW                                                           │
│     └─> Post-deployment review within 24 hours                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Exception Types and Approvers

| Exception Type | Required Approver | Time Limit | Audit Level |
|----------------|-------------------|------------|-------------|
| Deployment window | Release Captain | 4 hours | Standard |
| Security CVE waiver | Security Team + Engineering Director | 7 days | High |
| SLO gate bypass | SRE Lead | 2 hours | High |
| Budget exhaustion deploy | VP Engineering | 1 hour | Critical |
| Deployment freeze override | VP Engineering + CTO | Per-case | Critical |

### Exception Logging

All exceptions are logged to the audit trail:

```typescript
interface ExceptionRecord {
  id: string;
  timestamp: string;
  type: 'window' | 'security' | 'slo' | 'budget' | 'freeze';
  service: string;
  requestor: string;
  approvers: string[];
  reason: string;
  mitigation: string;
  expiration: string;
  deployment_id?: string;
  reviewed: boolean;
  review_notes?: string;
}
```

---

## Appendix: Quick Reference

### Deployment Commands

```bash
# Start canary deployment
kubectl argo rollouts set image <service> api=<new-image>

# Check rollout status
kubectl argo rollouts status <service>

# Promote canary to full
kubectl argo rollouts promote <service>

# Abort rollout
kubectl argo rollouts abort <service>

# Rollback
kubectl argo rollouts undo <service>

# View rollout history
kubectl argo rollouts history <service>
```

### Key Metrics to Watch

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate (5xx) | > 1% | > 5% |
| Latency p95 | > 300ms | > 500ms |
| CPU usage | > 70% | > 85% |
| Memory usage | > 75% | > 90% |
| Error budget burn | > 1x | > 5x |

### Contact Information

| Role | Slack | PagerDuty |
|------|-------|-----------|
| Release Captain | #release-captain | @release-oncall |
| SRE Team | #sre-team | @sre-oncall |
| Platform Team | #platform-team | @platform-oncall |
| Security Team | #security | @security-oncall |

---

*Document maintained by Reliability & Release Team. Review quarterly or after major incidents.*
