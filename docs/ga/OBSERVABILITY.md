# MVP-4-GA Observability Guide

> **Version**: 1.0
> **Last Updated**: 2025-12-30
> **Status**: Production-Ready
> **Audience**: SRE, DevOps, On-Call Engineers

---

## Executive Summary

This guide defines the **observability strategy** for Summit MVP-4-GA, covering monitoring, alerting, logging, tracing, and dashboards. It ensures the system is **transparent, diagnosable, and operable** at all times.

**Observability Philosophy**: "You can't fix what you can't see. Instrument everything."

---

## Table of Contents

1. [Observability Stack](#1-observability-stack)
2. [Metrics](#2-metrics)
3. [Logging](#3-logging)
4. [Distributed Tracing](#4-distributed-tracing)
5. [Dashboards](#5-dashboards)
6. [Alerting](#6-alerting)
7. [SLOs & Error Budgets](#7-slos--error-budgets)
8. [Troubleshooting Runbooks](#8-troubleshooting-runbooks)

---

## 1. Observability Stack

### 1.1 Technology Stack

| Component | Technology | Purpose | Retention |
|-----------|-----------|---------|-----------|
| **Metrics** | Prometheus + VictoriaMetrics | Time-series metrics | 30 days |
| **Logs** | Loki + Grafana | Structured logging | 90 days |
| **Traces** | Tempo + OpenTelemetry | Distributed tracing | 7 days |
| **Dashboards** | Grafana | Visualization | N/A |
| **Alerting** | Alertmanager + PagerDuty | Incident notification | 30 days |
| **APM** | OpenTelemetry Collector | Application performance | 7 days |

### 1.2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Application Services                   │
│  (Server, Client, Gateway, Policy Engine)              │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
            ├─ Metrics (Prometheus)       ├─ Traces (OTLP)
            ├─ Logs (stdout/stderr)       │
            │                             │
            ▼                             ▼
┌─────────────────────┐       ┌─────────────────────────┐
│  OpenTelemetry      │       │  Logging Pipeline       │
│  Collector          │       │  (Fluent Bit → Loki)    │
└──────────┬──────────┘       └───────────┬─────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐       ┌─────────────────────────┐
│  Prometheus         │       │  Loki                   │
│  (Metrics Storage)  │       │  (Log Storage)          │
└──────────┬──────────┘       └───────────┬─────────────┘
           │                              │
           ├──────────────────────────────┤
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│                     Grafana                             │
│  (Dashboards, Queries, Alerts)                         │
└─────────────────────────────────────────────────────────┘
           │
           ├─ Alertmanager ─> PagerDuty / Slack
           │
           └─ Tempo (Trace Storage)
```

---

## 2. Metrics

### 2.1 Golden Signals

#### Latency
```promql
# P95 request latency by endpoint
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
)

# SLO: P95 < 200ms for all API endpoints
```

#### Traffic
```promql
# Requests per second
sum(rate(http_requests_total[5m])) by (service, method, status)

# Target: Sustain 1000 req/s
```

#### Errors
```promql
# Error rate (4xx + 5xx)
sum(rate(http_requests_total{status=~"[45].."}[5m])) by (service, status)
/ sum(rate(http_requests_total[5m])) by (service)

# SLO: Error rate < 0.1%
```

#### Saturation
```promql
# CPU utilization
avg(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Memory utilization
avg(container_memory_usage_bytes / container_spec_memory_limit_bytes) by (pod)

# SLO: CPU < 70%, Memory < 80%
```

### 2.2 Business Metrics

```promql
# Policy evaluations per second
sum(rate(policy_evaluations_total[5m])) by (decision)

# Approval workflows created
sum(rate(approval_workflows_created_total[5m])) by (workflow_type)

# Audit events ingested
sum(rate(audit_events_total[5m])) by (event_type)

# Active sessions
sum(active_sessions) by (service)
```

### 2.3 Custom Metrics

| Metric Name | Type | Labels | Purpose |
|-------------|------|--------|---------|
| `policy_evaluation_duration_seconds` | Histogram | `decision`, `policy_path` | Policy eval latency |
| `attestation_verification_duration_seconds` | Histogram | `result`, `slsa_level` | Attestation verify latency |
| `approval_workflow_duration_seconds` | Histogram | `workflow_type`, `outcome` | Approval time |
| `audit_ingestion_rate` | Counter | `event_type`, `severity` | Audit events/sec |
| `tenant_isolation_violations_total` | Counter | `tenant_id`, `resource_type` | Isolation breaches |
| `rate_limit_exceeded_total` | Counter | `endpoint`, `tenant_id` | Rate limit hits |

### 2.4 Instrumentation Example

```typescript
import { register, Counter, Histogram } from 'prom-client';

// Counter: Policy evaluations
const policyEvaluations = new Counter({
  name: 'policy_evaluations_total',
  help: 'Total policy evaluations',
  labelNames: ['decision', 'policy_path', 'tenant_id'],
});

// Histogram: Latency
const policyLatency = new Histogram({
  name: 'policy_evaluation_duration_seconds',
  help: 'Policy evaluation latency',
  labelNames: ['decision', 'policy_path'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Usage
async function evaluatePolicy(input: PolicyInput): Promise<Verdict> {
  const end = policyLatency.startTimer();
  try {
    const verdict = await opa.evaluate(input);
    policyEvaluations.inc({ decision: verdict.decision, policy_path: input.policyPath, tenant_id: input.tenant });
    end({ decision: verdict.decision, policy_path: input.policyPath });
    return verdict;
  } catch (error) {
    end({ decision: 'ERROR', policy_path: input.policyPath });
    throw error;
  }
}
```

---

## 3. Logging

### 3.1 Structured Logging

**Format**: JSON Lines (JSONL)

```json
{
  "timestamp": "2025-12-30T10:30:00.123Z",
  "level": "INFO",
  "service": "summit-server",
  "pod": "summit-server-7d8f9c-xk2p5",
  "trace_id": "a1b2c3d4e5f6g7h8",
  "span_id": "i9j0k1l2m3n4",
  "correlation_id": "req-12345",
  "user_id": "user-789",
  "message": "Policy evaluation completed",
  "decision": "ALLOW",
  "policy_version": "v4.0.0",
  "duration_ms": 8
}
```

### 3.2 Log Levels

| Level | When to Use | Examples |
|-------|-------------|----------|
| **DEBUG** | Development/troubleshooting | Variable values, internal state |
| **INFO** | Normal operation | Request started, policy evaluated |
| **WARN** | Recoverable errors | Cache miss, retry attempted |
| **ERROR** | Unrecoverable errors | Database connection failed |
| **CRITICAL** | System-wide failure | Service unavailable, data corruption |

### 3.3 Required Log Context

**Every log entry MUST include**:
- `timestamp` (ISO 8601)
- `level` (DEBUG/INFO/WARN/ERROR/CRITICAL)
- `service` (service name)
- `trace_id` (OpenTelemetry trace ID)
- `correlation_id` (user request ID)
- `message` (human-readable)

**Optional but recommended**:
- `user_id` (authenticated user)
- `tenant_id` (multi-tenancy)
- `duration_ms` (operation duration)
- `error` (error details if level >= WARN)

### 3.4 Log Queries (LogQL)

```logql
# All errors in last hour
{service="summit-server"} | json | level="ERROR" | line_format "{{.timestamp}} {{.message}}"

# Policy denials for specific user
{service="summit-server"} | json | user_id="user-123" | decision="DENY"

# Slow queries (>1s)
{service="summit-server"} | json | duration_ms > 1000

# Correlation ID trace
{service=~"summit-.*"} | json | correlation_id="req-12345"
```

---

## 4. Distributed Tracing

### 4.1 Trace Propagation

**Protocol**: W3C Trace Context (traceparent header)

```
traceparent: 00-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-q7r8s9t0u1v2w3x4-01
             │  └─────────────────┬──────────────────┘ └──────┬──────┘ │
             │                    │                           │        │
             │                    │                           │        └─ Flags
             │                    │                           └─ Parent Span ID
             │                    └─ Trace ID
             └─ Version
```

### 4.2 Span Hierarchy

```
Trace: User Request → Policy → Service → Database
├─ Span: API Gateway (5ms)
│  ├─ Tag: http.method=POST
│  ├─ Tag: http.path=/api/entities/123
│  └─ Tag: user.id=user-456
│
├─ Span: Policy Evaluation (8ms)
│  ├─ Tag: policy.path=data.intelgraph.authz.allow
│  ├─ Tag: decision=ALLOW
│  ├─ Tag: policy.version=v4.0.0
│  └─ Event: Cache miss, fetching from OPA
│
├─ Span: Entity Service (120ms)
│  ├─ Tag: entity.id=123
│  ├─ Tag: entity.type=Person
│  └─ Span: Database Query (90ms)
│     ├─ Tag: db.system=postgresql
│     ├─ Tag: db.statement=SELECT * FROM entities WHERE id = $1
│     └─ Tag: db.rows_returned=1
```

### 4.3 Instrumentation

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('summit-server', 'v4.0.0');

async function evaluatePolicy(input: PolicyInput): Promise<Verdict> {
  return tracer.startActiveSpan('policy.evaluate', async (span) => {
    span.setAttribute('policy.path', input.policyPath);
    span.setAttribute('tenant.id', input.tenant);

    try {
      const verdict = await opa.evaluate(input);
      span.setAttribute('decision', verdict.decision);
      span.setAttribute('policy.version', verdict.policyVersion);
      span.setStatus({ code: SpanStatusCode.OK });
      return verdict;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 4.4 Trace Queries (TraceQL)

```traceql
# Find slow traces (>1s)
{ duration > 1s }

# Policy denials
{ span.decision = "DENY" }

# Database queries
{ resource.service.name = "summit-server" && span.db.system = "postgresql" }

# Errors
{ status = error }
```

---

## 5. Dashboards

### 5.1 Overview Dashboard

**URL**: `https://grafana.summit.internal/d/overview`

**Panels**:
1. **Request Rate** (Graph)
   - Query: `sum(rate(http_requests_total[5m])) by (service)`
   - Threshold: Red if < 100 req/s (anomaly)

2. **Error Rate** (Graph)
   - Query: `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`
   - Threshold: Red if > 0.1%

3. **P95 Latency** (Graph)
   - Query: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
   - Threshold: Red if > 200ms

4. **Active Sessions** (Gauge)
   - Query: `sum(active_sessions)`

5. **Policy Decisions** (Pie Chart)
   - Query: `sum(policy_evaluations_total) by (decision)`

### 5.2 Service Health Dashboard

**URL**: `https://grafana.summit.internal/d/service-health`

**Per-Service Panels**:
- CPU Usage
- Memory Usage
- Request Rate
- Error Rate
- P50/P95/P99 Latency

### 5.3 Policy Engine Dashboard

**URL**: `https://grafana.summit.internal/d/policy-engine`

**Panels**:
1. **Policy Evaluations/sec** by decision
2. **Policy Bundle Version** (gauge)
3. **Policy Load Time** (histogram)
4. **Decision Latency** (histogram)
5. **Top 10 Policies by Invocations**

### 5.4 Audit Trail Dashboard

**URL**: `https://grafana.summit.internal/d/audit-trail`

**Panels**:
1. **Audit Events/sec** by event type
2. **Decision Distribution** (ALLOW vs DENY)
3. **Top Users by Activity**
4. **Top Resources by Access**
5. **Approval Workflow Status**

---

## 6. Alerting

### 6.1 Alert Severity Levels

| Severity | Response Time | Notification | Examples |
|----------|--------------|--------------|----------|
| **P0 (Critical)** | Immediate | PagerDuty (page) | Service down, data corruption |
| **P1 (High)** | <15 min | PagerDuty + Slack | High error rate, SLO breach |
| **P2 (Medium)** | <1 hour | Slack | Elevated latency, warning logs |
| **P3 (Low)** | Next business day | Email | Info logs, capacity planning |

### 6.2 Alert Rules

#### P0: Service Availability

```yaml
alert: ServiceDown
expr: up{service="summit-server"} == 0
for: 1m
severity: P0
summary: "Summit server is down"
description: "No metrics received from {{ $labels.pod }} for 1 minute"
runbook: https://runbooks.summit.internal/service-down
```

#### P0: High Error Rate

```yaml
alert: HighErrorRate
expr: |
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
  > 0.05
for: 5m
severity: P0
summary: "Error rate above 5%"
description: "Current error rate: {{ $value | humanizePercentage }}"
runbook: https://runbooks.summit.internal/high-error-rate
```

#### P1: SLO Breach

```yaml
alert: LatencySLOBreach
expr: |
  histogram_quantile(0.95,
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
  ) > 0.2
for: 10m
severity: P1
summary: "P95 latency above 200ms"
description: "Current P95: {{ $value }}s"
runbook: https://runbooks.summit.internal/latency-slo-breach
```

#### P1: Policy Evaluation Failures

```yaml
alert: PolicyEvaluationFailures
expr: |
  sum(rate(policy_evaluations_total{decision="ERROR"}[5m]))
  /
  sum(rate(policy_evaluations_total[5m]))
  > 0.01
for: 5m
severity: P1
summary: "Policy evaluation failures above 1%"
description: "{{ $value | humanizePercentage }} of policy evaluations failing"
runbook: https://runbooks.summit.internal/policy-failures
```

#### P2: Disk Usage

```yaml
alert: HighDiskUsage
expr: |
  (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.2
for: 15m
severity: P2
summary: "Disk usage above 80%"
description: "Available: {{ $value | humanizePercentage }}"
runbook: https://runbooks.summit.internal/disk-cleanup
```

### 6.3 Alert Routing

```yaml
# Alertmanager configuration
route:
  receiver: default
  group_by: [alertname, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: P0
      receiver: pagerduty-critical
      continue: true

    - match:
        severity: P1
      receiver: pagerduty-high
      continue: true

    - match:
        severity: P2
      receiver: slack-alerts

    - match:
        severity: P3
      receiver: email-alerts

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: <PAGERDUTY_KEY>
        severity: critical

  - name: slack-alerts
    slack_configs:
      - channel: '#summit-alerts'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## 7. SLOs & Error Budgets

### 7.1 Service Level Objectives

| SLO | Target | Measurement Window | Error Budget (30d) |
|-----|--------|-------------------|-------------------|
| **Availability** | 99.9% | 30 days | 43 minutes |
| **Latency (P95)** | <200ms | 1 hour | 5% of requests |
| **Error Rate** | <0.1% | 1 hour | 1000 errors per 1M requests |
| **Policy Eval (P99)** | <20ms | 1 hour | 1% of evals |

### 7.2 Error Budget Calculation

```promql
# Availability error budget
1 - (
  sum(up{service="summit-server"} == 1) / count(up{service="summit-server"})
)

# Latency error budget
sum(
  rate(http_request_duration_seconds_bucket{le="0.2"}[30d])
) / sum(rate(http_request_duration_seconds_count[30d]))

# Error rate budget
sum(rate(http_requests_total{status=~"5.."}[30d]))
/ sum(rate(http_requests_total[30d]))
```

### 7.3 Error Budget Policy

**When error budget is exhausted**:
1. **Freeze feature releases**: No new features until budget recovers
2. **Focus on reliability**: All hands on stability improvements
3. **Root cause analysis**: Mandatory postmortems for all incidents
4. **Escalate**: Inform leadership of budget status

**Budget recovery**:
- Review after 7 days
- Gradual re-enablement of feature releases

---

## 8. Troubleshooting Runbooks

### 8.1 High Latency

**Runbook**: `docs/runbooks/high-latency.md`

**Steps**:
1. Check current P95: `curl prometheus/query?query=http_p95_latency`
2. Identify slow endpoints: Check trace samples in Tempo
3. Check database:
   - Query: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
   - Look for slow queries or missing indexes
4. Check OPA performance: `kubectl logs -n governance deployment/opa | grep "evaluation_duration"`
5. Scale up if CPU/memory saturated

### 8.2 Policy Failures

**Runbook**: `docs/runbooks/policy-failures.md`

**Steps**:
1. Check OPA health: `curl opa.internal/health?bundle=true`
2. Verify bundle version: `curl opa.internal/v1/data/system/bundles`
3. Check policy tests: `opa test policies/ -v`
4. Review policy evaluation logs: `kubectl logs -n governance deployment/opa --tail=100 | grep ERROR`
5. Rollback if needed: See [Policy Rollback](#72-policy-rollback)

### 8.3 Database Connection Issues

**Runbook**: `docs/runbooks/db-connection-issues.md`

**Steps**:
1. Check connection pool: `SELECT count(*) FROM pg_stat_activity;`
2. Check for locks: `SELECT * FROM pg_locks WHERE NOT granted;`
3. Restart connection pool: `kubectl rollout restart deployment/summit-server`
4. Failover to replica if primary down

---

**Document Control**:
- **Version**: 1.0
- **Owner**: SRE Team
- **Approvers**: Infrastructure Lead, On-Call Lead
- **Next Review**: Post-GA +30 days
