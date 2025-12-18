# Alert Runbook Catalogue

## APIErrorBudgetFastBurn

- Severity: `critical`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/observability-sre

**Summary**: API error budget burning too fast (5m window)

**Description**: IntelGraph API burn rate >14.4x. Auto-rollback triggered in pipeline.

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "APIErrorBudgetFastBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "APIErrorBudgetFastBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(1 - (sum(rate(http_requests_total{service="intelgraph-api",status!~"5.."}[5m])) /
  sum(rate(http_requests_total{service="intelgraph-api"}[5m])))) / 0.001 > 14.4
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## APIErrorBudgetSlowBurn

- Severity: `warning`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/observability-sre

**Summary**: API error budget sustained burn (1h window)

**Description**: IntelGraph API error budget consuming >6x over 1h. Investigate before budget exhaustion.

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "APIErrorBudgetSlowBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "APIErrorBudgetSlowBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(1 - (sum(rate(http_requests_total{service="intelgraph-api",status!~"5.."}[1h])) /
  sum(rate(http_requests_total{service="intelgraph-api"}[1h])))) / 0.001 > 6
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## APIErrorRateSLOBurn

- Severity: `critical`
- Service/Component: `api`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/slo/api-error-rate

**Summary**: API error rate SLO breach

**Description**: API error rate is {{ $value | humanizePercentage }} (threshold: 1%) over the last 5 minutes

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "APIErrorRateSLOBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "APIErrorRateSLOBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(
  sum(rate(http_requests_total{job="intelgraph-api",status=~"5.."}[5m])) /
  sum(rate(http_requests_total{job="intelgraph-api"}[5m]))
) > 0.01
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ApprovalBottleneck

- Severity: `warning`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/approval-bottleneck

**Summary**: Large backlog of pending approvals

**Description**: {{ $value }} mutations pending approval for 30+ minutes

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ApprovalBottleneck"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ApprovalBottleneck"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `approval_pending_total > 50`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## AuthenticationFailureSpike

- Severity: `critical`
- Service/Component: `security`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/security/auth-failures

**Summary**: Authentication failure spike detected

**Description**: Authentication failures at {{ $value }} per second over the last 5 minutes

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "AuthenticationFailureSpike"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "AuthenticationFailureSpike"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `sum(rate(auth_failures_total[5m])) > 10
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## BudgetGuardLatencyCritical

- Severity: `critical`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/budget-guard-latency

**Summary**: Budget guard latency critically high

**Description**: Budget guard p95 latency is {{ $value }}ms for 15+ minutes (threshold: 120ms)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "BudgetGuardLatencyCritical"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "BudgetGuardLatencyCritical"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `histogram_quantile(0.95, rate(mutation_latency_ms_bucket{stage="budget"}[5m])) > 120`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## BudgetGuardLatencyWarning

- Severity: `warning`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/budget-guard-latency

**Summary**: Budget guard latency exceeding warning threshold

**Description**: Budget guard p95 latency is {{ $value }}ms for 15+ minutes (threshold: 60ms)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "BudgetGuardLatencyWarning"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "BudgetGuardLatencyWarning"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `histogram_quantile(0.95, rate(mutation_latency_ms_bucket{stage="budget"}[5m])) > 60`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## BuildTimeRegression

- Severity: `warning`
- Service/Component: `ci_cd`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/ci/build-regression

**Summary**: Build time regression detected

**Description**: 95th percentile build time for {{ $labels.pipeline }} is {{ $value }}s (threshold: 600s)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "BuildTimeRegression"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "BuildTimeRegression"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `histogram_quantile(0.95,
  sum(rate(build_duration_seconds_bucket{status="success"}[1h])) by (pipeline, le)
) > 600
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## CanaryDailyBudgetApproaching

- Severity: `warning`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/canary-budget-limits

**Summary**: Canary tenant approaching daily budget limit

**Description**: Tenant {{ $labels.tenant }} at {{ $value | humanizePercentage }} of daily budget

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "CanaryDailyBudgetApproaching"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "CanaryDailyBudgetApproaching"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(intelgraph_daily_spend_usd{tenant=~"demo|test|maestro-internal"} / 
 intelgraph_daily_limit_usd{tenant=~"demo|test|maestro-internal"}) > 0.8
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## CanaryDailyBudgetExceeded

- Severity: `critical`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/canary-budget-exceeded

**Summary**: Canary tenant exceeded daily budget limit

**Description**: Tenant {{ $labels.tenant }} at {{ $value | humanizePercentage }} of daily budget - mutations blocked

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "CanaryDailyBudgetExceeded"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "CanaryDailyBudgetExceeded"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(intelgraph_daily_spend_usd{tenant=~"demo|test|maestro-internal"} / 
 intelgraph_daily_limit_usd{tenant=~"demo|test|maestro-internal"}) >= 1.0
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## CircuitBreakerOpen

- Severity: `critical`
- Service/Component: `model_orchestration`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/model/circuit-breaker

**Summary**: Circuit breaker is open

**Description**: Circuit breaker for {{ $labels.provider }} is open

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "CircuitBreakerOpen"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "CircuitBreakerOpen"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `circuit_breaker_state{provider=~".+"} == 1
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## DatabaseConnectionPoolHigh

- Severity: `warning`
- Service/Component: `neo4j`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/slo/db-connections

**Summary**: Database connection pool usage high

**Description**: Neo4j connection pool is {{ $value | humanizePercentage }} full (threshold: 80%)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "DatabaseConnectionPoolHigh"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "DatabaseConnectionPoolHigh"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(
  neo4j_connections_active{job="neo4j"} /
  neo4j_connections_max{job="neo4j"}
) > 0.8
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## DiskSpaceLow

- Severity: `critical`
- Service/Component: `infrastructure`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: (auto-generated: see steps below)

**Summary**: Disk space running low

**Description**: Disk space is {{ $value }}% free on {{ $labels.instance }}:{{ $labels.mount }}

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "DiskSpaceLow"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "DiskSpaceLow"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(
  disk_free_bytes / disk_total_bytes * 100
) < 20
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ExportLatencySLOBurn

- Severity: `warning`
- Service/Component: `api`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/slo/export-latency

**Summary**: Data export latency SLO breach

**Description**: 95th percentile export latency is {{ $value }}s (threshold: 1.2s)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ExportLatencySLOBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ExportLatencySLOBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `histogram_quantile(0.95,
  sum(rate(export_duration_seconds_bucket{job="intelgraph-api"}[5m])) by (le)
) > 1.2
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## HighCPUUsage

- Severity: `warning`
- Service/Component: `infrastructure`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: (auto-generated: see steps below)

**Summary**: High CPU usage detected

**Description**: CPU usage is {{ $value }}% on instance {{ $labels.instance }}

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "HighCPUUsage"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "HighCPUUsage"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(
  100 - (avg by (instance) (rate(cpu_usage_idle_seconds_total[5m])) * 100)
) > 80
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## HighFalsePositiveDenials

- Severity: `warning`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/false-positive-denials

**Summary**: High rate of false-positive budget denials

**Description**: {{ $value | humanizePercentage }} of mutations falsely denied (target: <0.1%)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "HighFalsePositiveDenials"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "HighFalsePositiveDenials"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `rate(budget_denials_total{reason="misconfig"}[7d]) / rate(mutation_requests_total[7d]) > 0.005`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## HighMemoryUsage

- Severity: `warning`
- Service/Component: `infrastructure`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: (auto-generated: see steps below)

**Summary**: High memory usage detected

**Description**: Memory usage is {{ $value }}% on instance {{ $labels.instance }}

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "HighMemoryUsage"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "HighMemoryUsage"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(
  memory_usage_bytes / memory_total_bytes * 100
) > 85
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## IngestErrorBudgetFastBurn

- Severity: `critical`
- Service/Component: `intelgraph-ingest`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/observability-sre

**Summary**: Ingest error budget fast burn

**Description**: Streaming ingest burn rate >8x (5m). Canary rollback recommended.

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "IngestErrorBudgetFastBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "IngestErrorBudgetFastBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(1 - (sum(rate(ingest_success_total[5m])) /
  sum(rate(ingest_attempts_total[5m])))) / 0.005 > 8
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## IngestErrorBudgetSlowBurn

- Severity: `warning`
- Service/Component: `intelgraph-ingest`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/observability-sre

**Summary**: Ingest error budget sustained burn

**Description**: Ingest pipeline burning >4x budget over 1h. Address backlog or pause deploys.

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "IngestErrorBudgetSlowBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "IngestErrorBudgetSlowBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(1 - (sum(rate(ingest_success_total[1h])) /
  sum(rate(ingest_attempts_total[1h])))) / 0.005 > 4
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## IngestLatencySLOBurn

- Severity: `warning`
- Service/Component: `api`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/slo/ingest-latency

**Summary**: Data ingest latency SLO breach

**Description**: 95th percentile ingest latency is {{ $value }}s (threshold: 1.5s)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "IngestLatencySLOBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "IngestLatencySLOBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `histogram_quantile(0.95,
  sum(rate(ingest_duration_seconds_bucket{job="intelgraph-api"}[5m])) by (le)
) > 1.5
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ModelBudgetNearLimit

- Severity: `warning`
- Service/Component: `gateway`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/slo/model-budget

**Summary**: Model budget approaching limit

**Description**: Model budget is {{ $value | humanizePercentage }} spent for environment {{ $labels.env }}

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ModelBudgetNearLimit"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ModelBudgetNearLimit"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(
  model_budget_spent_dollars{env="demo"} /
  model_budget_limit_dollars{env="demo"}
) > 0.8
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ModelLatencyHigh

- Severity: `warning`
- Service/Component: `model_orchestration`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/model/latency

**Summary**: Model latency is high

**Description**: 95th percentile latency for {{ $labels.provider }}/{{ $labels.model }} is {{ $value }}s

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ModelLatencyHigh"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ModelLatencyHigh"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `histogram_quantile(0.95,
  sum(rate(model_request_duration_seconds_bucket[5m])) by (provider, model, le)
) > 10
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ModelProviderHighErrorRate

- Severity: `critical`
- Service/Component: `model_orchestration`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/model/error-rate

**Summary**: Model provider error rate high

**Description**: Error rate for {{ $labels.provider }}/{{ $labels.model }} is {{ $value | humanizePercentage }}

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ModelProviderHighErrorRate"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ModelProviderHighErrorRate"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(
  sum(rate(model_requests_total{status="error"}[5m])) by (provider, model) /
  sum(rate(model_requests_total[5m])) by (provider, model)
) > 0.1
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## NLQLatencySLOBurn

- Severity: `critical`
- Service/Component: `gateway`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/slo/nlq-latency

**Summary**: NL→Cypher latency SLO burning fast

**Description**: 95th percentile NL→Cypher latency is {{ $value }}s (threshold: 2.0s) over the last 5 minutes

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "NLQLatencySLOBurn"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "NLQLatencySLOBurn"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(
  histogram_quantile(0.95,
    sum(rate(nlq_duration_seconds_bucket{job="intelgraph-gateway"}[5m])) by (le)
  ) > 2.0
) and (
  sum(rate(nlq_duration_seconds_count{job="intelgraph-gateway"}[5m])) > 0.1
)
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## PersistentQueryViolations

- Severity: `warning`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/persisted-query-violations

**Summary**: High rate of persisted query violations

**Description**: {{ $value }} PQ violations per second - check client implementations

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "PersistentQueryViolations"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "PersistentQueryViolations"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `rate(pq_violations_total[5m]) > 10`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## PlatformCostGuardrailCritical

- Severity: `critical`
- Service/Component: `finops`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/observability-sre#finops-guardrail

**Summary**: Platform costs exceeded 90% of budget

**Description**: Monthly spend is {{ $value | humanizePercentage }} of budget. Freeze deploys and trigger cost rollback.

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "PlatformCostGuardrailCritical"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "PlatformCostGuardrailCritical"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(intelgraph_monthly_spend_usd / intelgraph_monthly_budget_usd) > 0.9`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## PlatformCostGuardrailWarning

- Severity: `warning`
- Service/Component: `finops`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/observability-sre#finops-guardrail

**Summary**: Platform costs exceeded 80% of budget

**Description**: FinOps data shows {{ $value | humanizePercentage }} of monthly budget used. Coordinate feature flags.

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "PlatformCostGuardrailWarning"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "PlatformCostGuardrailWarning"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(intelgraph_monthly_spend_usd / intelgraph_monthly_budget_usd) > 0.8`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## PolicyViolationIncrease

- Severity: `warning`
- Service/Component: `security`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/security/policy-violations

**Summary**: Policy violation rate increased

**Description**: Policy violations at {{ $value }} per second for policy {{ $labels.policy }}

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "PolicyViolationIncrease"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "PolicyViolationIncrease"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `sum(rate(policy_violations_total{action="deny"}[5m])) > 5
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ReconciliationCritical

- Severity: `critical`
- Service/Component: `intelgraph-reconciler`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/reconciliation-lag

**Summary**: Budget reconciliation critically behind

**Description**: Only {{ $value | humanizePercentage }} of ledger entries reconciled (target: 95%)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ReconciliationCritical"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ReconciliationCritical"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `(reconciled_entries_total / ledger_entries_total) < 0.85`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## ReconciliationLagging

- Severity: `warning`
- Service/Component: `intelgraph-reconciler`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/reconciliation-lag

**Summary**: Budget reconciliation falling behind

**Description**: Only {{ $value | humanizePercentage }} of ledger entries reconciled (target: 95%)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "ReconciliationLagging"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "ReconciliationLagging"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `(reconciled_entries_total / ledger_entries_total) < 0.90`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## RedisLatencyHigh

- Severity: `warning`
- Service/Component: `redis`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/redis-latency

**Summary**: Redis latency impacting rate limiting

**Description**: Redis p95 latency is {{ $value }}ms (threshold: 5ms)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "RedisLatencyHigh"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "RedisLatencyHigh"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `redis_latency_p95_ms > 5`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## SafeMutationsDown

- Severity: `critical`
- Service/Component: `intelgraph-api`
- Source: `ops/slos-and-alerts.yaml`
- Runbook URL: https://docs.intelgraph.dev/runbooks/api-down

**Summary**: IntelGraph API completely down

**Description**: No healthy API instances detected

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "SafeMutationsDown"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "SafeMutationsDown"
```

### Signals to validate
- PagerDuty escalation: ensure `critical` routes to on-call and resolves after remediation.
- PromQL check: `up{job="intelgraph-api"} == 0`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.

## TestCoverageDropped

- Severity: `warning`
- Service/Component: `ci_cd`
- Source: `ops/alerts/slo-burn-rules.yml`
- Runbook URL: https://runbooks.intelgraph.io/ci/test-coverage

**Summary**: Test coverage dropped below threshold

**Description**: Test coverage for {{ $labels.suite }} is {{ $value }}% (threshold: 75%)

### One-click remediation
```sh
./ops/runbooks/one_click_remediation.sh "TestCoverageDropped"
```

### Verification hooks
```sh
./ops/runbooks/verify_remediation.sh "TestCoverageDropped"
```

### Signals to validate
- PagerDuty escalation: ensure `warning` routes to on-call and resolves after remediation.
- PromQL check: `test_coverage_percent < 75
`
- Post-action SLO: verify service dashboard shows recovery before closing the incident.
