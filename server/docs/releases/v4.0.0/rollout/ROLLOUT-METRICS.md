# Summit v4.0.0 Rollout Metrics Dashboard Specification

This document defines the metrics to monitor during the v4.0.0 rollout, including collection methods, thresholds, and alerting configurations.

---

## 1. Metrics Categories

### Overview

| Category    | Purpose                                     | Primary Audience       |
| ----------- | ------------------------------------------- | ---------------------- |
| Adoption    | Track customer migration and feature uptake | Product, CS, Executive |
| Stability   | Monitor system health and reliability       | SRE, Engineering       |
| Performance | Track latency and throughput                | SRE, Engineering       |
| Quality     | Track bugs and issues                       | Engineering, QA        |
| Feedback    | Aggregate user sentiment                    | Product, CS            |
| Capacity    | Monitor resource utilization                | SRE, Infrastructure    |

---

## 2. Adoption Metrics

### 2.1 Migration Progress

| Metric                   | Description                     | Collection               | Target by Phase             |
| ------------------------ | ------------------------------- | ------------------------ | --------------------------- |
| `v4_customers_total`     | Total customers on v4           | Count from tenant config | Beta: 10, GA: 50%, L+4: 90% |
| `v4_migration_started`   | Customers who started migration | Event tracking           | 100% by L+2                 |
| `v4_migration_completed` | Customers fully migrated        | Event tracking           | 90% by L+8                  |
| `v4_api_calls_ratio`     | v4 calls / (v3 + v4) calls      | Request logs             | GA: 50%, L+4: 90%           |

**Dashboard Panel: Migration Funnel**

```
┌─────────────────────────────────────────────────────────────┐
│ Migration Progress                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Not Started ████████████████████████████████████  60%      │
│  In Progress ███████████████                       25%      │
│  Completed   ██████                                15%      │
│                                                              │
│  [Trend chart: migration over time]                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Feature Adoption

| Metric                                 | Description                    | Collection      | Target (L+4) |
| -------------------------------------- | ------------------------------ | --------------- | ------------ |
| `ai_suggestions_tenants_enabled`       | Tenants with AI suggestions on | Tenant config   | 30%          |
| `ai_suggestions_generated_total`       | Total suggestions generated    | Service metrics | 1000         |
| `ai_suggestions_implemented_total`     | Suggestions implemented        | Service metrics | 100          |
| `ai_suggestions_implementation_rate`   | Implemented / Generated        | Calculated      | 10%          |
| `verdict_explanations_tenants_enabled` | Tenants with explanations on   | Tenant config   | 50%          |
| `verdict_explanations_generated_total` | Explanations generated         | Service metrics | 5000         |
| `anomaly_detection_tenants_enabled`    | Tenants with anomaly detection | Tenant config   | 25%          |
| `anomalies_detected_total`             | Anomalies detected             | Service metrics | 500          |
| `anomalies_resolved_total`             | Anomalies resolved             | Service metrics | 400          |
| `hipaa_assessments_total`              | HIPAA assessments run          | Service metrics | 200          |
| `hipaa_tenants_enabled`                | Tenants with HIPAA enabled     | Tenant config   | 20%          |
| `sox_assessments_total`                | SOX assessments run            | Service metrics | 100          |
| `sox_tenants_enabled`                  | Tenants with SOX enabled       | Tenant config   | 15%          |
| `hsm_keys_created_total`               | HSM keys created               | Service metrics | 500          |
| `hsm_tenants_enabled`                  | Tenants using HSM              | Tenant config   | 20%          |
| `audit_events_total`                   | Audit events logged            | Service metrics | 100000       |

**Dashboard Panel: Feature Adoption Grid**

```
┌─────────────────────────────────────────────────────────────┐
│ Feature Adoption                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AI Suggestions    ████████░░░░░░░░  30%  (target: 30%)     │
│  Explanations      ███████████████░  75%  (target: 50%)     │
│  Anomaly Detection ██████░░░░░░░░░░  20%  (target: 25%)     │
│  HIPAA Compliance  ████████░░░░░░░░  25%  (target: 20%)     │
│  SOX Compliance    ██████░░░░░░░░░░  18%  (target: 15%)     │
│  HSM Integration   ████░░░░░░░░░░░░  12%  (target: 20%)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 API Usage

| Metric                        | Description             | Collection      | Baseline |
| ----------------------------- | ----------------------- | --------------- | -------- |
| `v4_api_requests_total`       | Total v4 API requests   | Request counter | -        |
| `v4_api_requests_by_endpoint` | Requests per endpoint   | Request counter | -        |
| `v4_api_unique_users`         | Unique users calling v4 | Request logs    | -        |
| `v4_api_unique_tenants`       | Unique tenants on v4    | Request logs    | -        |

---

## 3. Stability Metrics

### 3.1 Availability

| Metric                            | Description                 | SLO    | Alert Threshold |
| --------------------------------- | --------------------------- | ------ | --------------- |
| `api_availability_percent`        | Successful requests / Total | 99.9%  | <99.5%          |
| `ai_service_availability`         | AI service uptime           | 99.5%  | <99.0%          |
| `compliance_service_availability` | Compliance service uptime   | 99.9%  | <99.5%          |
| `hsm_service_availability`        | HSM service uptime          | 99.99% | <99.9%          |
| `audit_service_availability`      | Audit service uptime        | 99.99% | <99.9%          |

**Dashboard Panel: Service Health**

```
┌─────────────────────────────────────────────────────────────┐
│ Service Health (Last 24h)                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Core API          ●  99.98%  [████████████████████]        │
│  AI Governance     ●  99.72%  [████████████████████]        │
│  Compliance        ●  99.95%  [████████████████████]        │
│  HSM/Zero-Trust    ●  99.99%  [████████████████████]        │
│  Audit Ledger      ●  100.0%  [████████████████████]        │
│                                                              │
│  ● Healthy  ○ Degraded  ◉ Down                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Error Rates

| Metric                  | Description                   | Target | Alert Threshold |
| ----------------------- | ----------------------------- | ------ | --------------- |
| `v4_error_rate_5xx`     | 5xx errors / Total requests   | <0.1%  | >1%             |
| `v4_error_rate_4xx`     | 4xx errors / Total requests   | <5%    | >10%            |
| `ai_error_rate`         | AI service error rate         | <1%    | >5%             |
| `compliance_error_rate` | Compliance service error rate | <0.5%  | >2%             |
| `hsm_error_rate`        | HSM operation error rate      | <0.1%  | >0.5%           |
| `audit_error_rate`      | Audit write error rate        | <0.01% | >0.1%           |

**Dashboard Panel: Error Rates Over Time**

```
┌─────────────────────────────────────────────────────────────┐
│ Error Rates (7-day trend)                                    │
├─────────────────────────────────────────────────────────────┤
│  1.0% ┤                                                      │
│       │                                                      │
│  0.5% ┤     ╭─╮                                              │
│       │    ╭╯ ╰╮                                             │
│  0.1% ┼───╯    ╰──────────────────────────────────          │
│       │                                                      │
│    0% ┼─────────────────────────────────────────────        │
│       └──────────────────────────────────────────────       │
│         D-7   D-6   D-5   D-4   D-3   D-2   D-1   Today     │
│                                                              │
│  ─── 5xx Rate   ─ ─ Target (0.1%)                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Incidents

| Metric                     | Description              | Target | Alert |
| -------------------------- | ------------------------ | ------ | ----- |
| `incidents_p0_count`       | P0 incidents this period | 0      | Any   |
| `incidents_p1_count`       | P1 incidents this period | <2     | >3    |
| `incident_mttr_minutes`    | Mean time to resolve     | <60    | >120  |
| `incident_customer_impact` | Affected customers       | <10%   | >25%  |

---

## 4. Performance Metrics

### 4.1 Latency

| Metric                              | Description                 | SLO (p99) | Alert Threshold |
| ----------------------------------- | --------------------------- | --------- | --------------- |
| `api_latency_p50`                   | Median API latency          | <100ms    | >200ms          |
| `api_latency_p95`                   | 95th percentile latency     | <500ms    | >1s             |
| `api_latency_p99`                   | 99th percentile latency     | <1s       | >2s             |
| `ai_suggestions_latency_p99`        | Policy suggestion latency   | <10s      | >15s            |
| `ai_explanations_latency_p99`       | Verdict explanation latency | <5s       | >8s             |
| `anomaly_detection_latency_p99`     | Anomaly detection latency   | <5min     | >15min          |
| `compliance_assessment_latency_p99` | Assessment execution        | <30s      | >60s            |
| `hsm_operation_latency_p99`         | HSM operation latency       | <200ms    | >500ms          |
| `audit_write_latency_p99`           | Audit event write           | <100ms    | >250ms          |

**Dashboard Panel: Latency Distribution**

```
┌─────────────────────────────────────────────────────────────┐
│ API Latency Distribution (Last Hour)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Count                                                       │
│   │    ╭───╮                                                 │
│   │   ╭╯   ╰╮                                                │
│   │  ╭╯     ╰╮                                               │
│   │ ╭╯       ╰──╮                                            │
│   │╭╯           ╰───────────────────────                     │
│   └────────────────────────────────────────────── Latency    │
│     0   50   100   200   500   1s    2s    5s                │
│                                                              │
│  p50: 45ms   p95: 320ms   p99: 890ms                        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Throughput

| Metric                            | Description               | Baseline  | Alert      |
| --------------------------------- | ------------------------- | --------- | ---------- |
| `api_requests_per_second`         | API request rate          | 1000 rps  | >5000 rps  |
| `ai_requests_per_minute`          | AI service request rate   | 100 rpm   | >500 rpm   |
| `compliance_assessments_per_hour` | Assessment execution rate | 50/hr     | >200/hr    |
| `hsm_operations_per_second`       | HSM operation rate        | 100 ops/s | >500 ops/s |
| `audit_events_per_second`         | Audit write rate          | 500 eps   | >2000 eps  |

### 4.3 External Dependencies

| Metric                      | Description             | SLO    | Alert  |
| --------------------------- | ----------------------- | ------ | ------ |
| `llm_provider_latency_p99`  | LLM API response time   | <3s    | >5s    |
| `llm_provider_error_rate`   | LLM API error rate      | <1%    | >5%    |
| `llm_provider_availability` | LLM API uptime          | 99%    | <95%   |
| `hsm_provider_latency_p99`  | HSM provider latency    | <100ms | >200ms |
| `hsm_provider_error_rate`   | HSM provider error rate | <0.1%  | >1%    |

---

## 5. Quality Metrics

### 5.1 Bug Tracking

| Metric                 | Description          | Target    | Alert |
| ---------------------- | -------------------- | --------- | ----- |
| `bugs_p0_open`         | Open P0 bugs         | 0         | Any   |
| `bugs_p1_open`         | Open P1 bugs         | <5        | >10   |
| `bugs_p2_open`         | Open P2 bugs         | <20       | >50   |
| `bugs_total_open`      | Total open bugs      | <50       | >100  |
| `bugs_new_this_week`   | New bugs reported    | <20       | >50   |
| `bugs_fixed_this_week` | Bugs fixed           | >bugs_new | -     |
| `bug_mttr_hours`       | Mean time to resolve | <24h (P1) | >48h  |

**Dashboard Panel: Bug Trend**

```
┌─────────────────────────────────────────────────────────────┐
│ Bug Trend (4 weeks)                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  50 ┤                                                        │
│     │  ╭──╮                                                  │
│  40 ┤ ╭╯  ╰╮                                                 │
│     │╭╯    ╰─╮                                               │
│  30 ┼╯       ╰──╮                                            │
│     │           ╰───────────────────                         │
│  20 ┤                                                        │
│     │                                                        │
│  10 ┤                                                        │
│     └─────────────────────────────────────────               │
│       W-4    W-3    W-2    W-1    Current                   │
│                                                              │
│  ─── New   ─ ─ Fixed   ▬▬▬ Open                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Test Quality

| Metric                | Description              | Target | Alert |
| --------------------- | ------------------------ | ------ | ----- |
| `test_pass_rate`      | Passing tests / Total    | >99%   | <95%  |
| `regression_failures` | Regression test failures | 0      | Any   |
| `code_coverage`       | Test code coverage       | >80%   | <70%  |

---

## 6. Feedback Metrics

### 6.1 Volume

| Metric                      | Description                | Baseline | Alert   |
| --------------------------- | -------------------------- | -------- | ------- |
| `feedback_received_total`   | Total feedback items       | -        | -       |
| `feedback_pending`          | Unprocessed feedback       | <20      | >50     |
| `support_tickets_v4`        | v4-related support tickets | <10/day  | >30/day |
| `support_tickets_migration` | Migration-related tickets  | <5/day   | >20/day |

### 6.2 Sentiment

| Metric                       | Description         | Target | Alert |
| ---------------------------- | ------------------- | ------ | ----- |
| `nps_score`                  | Net Promoter Score  | >50    | <30   |
| `sentiment_positive_percent` | Positive feedback % | >70%   | <50%  |
| `sentiment_negative_percent` | Negative feedback % | <15%   | >30%  |

**Dashboard Panel: Sentiment Trend**

```
┌─────────────────────────────────────────────────────────────┐
│ Feedback Sentiment                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  100% ┤────────────────────────────────────────             │
│       │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│   75% ┤▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒             │
│       │████████████████████████████████████████             │
│   50% ┤████████████████████████████████████████             │
│       │████████████████████████████████████████             │
│   25% ┤████████████████████████████████████████             │
│       │████████████████████████████████████████             │
│    0% ┼────────────────────────────────────────             │
│         W-4    W-3    W-2    W-1    Current                 │
│                                                              │
│  ███ Positive   ▒▒▒ Neutral   ░░░ Negative                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Response Time

| Metric                           | Description            | Target | Alert   |
| -------------------------------- | ---------------------- | ------ | ------- |
| `feedback_response_time_hours`   | Time to first response | <4h    | >24h    |
| `feedback_resolution_time_hours` | Time to resolve        | <48h   | >1 week |

---

## 7. Capacity Metrics

### 7.1 Infrastructure

| Metric                       | Description         | Threshold | Alert |
| ---------------------------- | ------------------- | --------- | ----- |
| `cpu_utilization_percent`    | CPU usage           | <70%      | >85%  |
| `memory_utilization_percent` | Memory usage        | <80%      | >90%  |
| `disk_utilization_percent`   | Disk usage          | <70%      | >85%  |
| `network_throughput_mbps`    | Network utilization | <80%      | >90%  |

### 7.2 Application

| Metric                     | Description                | Threshold | Alert |
| -------------------------- | -------------------------- | --------- | ----- |
| `db_connection_pool_used`  | Active DB connections      | <80%      | >90%  |
| `hsm_connection_pool_used` | Active HSM connections     | <70%      | >85%  |
| `llm_rate_limit_remaining` | LLM API quota remaining    | >20%      | <10%  |
| `queue_depth`              | Background job queue depth | <1000     | >5000 |
| `queue_latency_seconds`    | Job wait time              | <60s      | >300s |

**Dashboard Panel: Capacity Overview**

```
┌─────────────────────────────────────────────────────────────┐
│ Capacity Utilization                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CPU          [████████░░░░░░░░░░░░] 40%                    │
│  Memory       [██████████████░░░░░░] 70%                    │
│  Disk         [██████████░░░░░░░░░░] 50%                    │
│  DB Conns     [████████████░░░░░░░░] 60%                    │
│  HSM Conns    [██████░░░░░░░░░░░░░░] 30%                    │
│  LLM Quota    [██████████████████░░] 90% remaining          │
│                                                              │
│  ░░░ Available   ████ Used   [Warning >80%]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Alerting Configuration

### Critical Alerts (PagerDuty - Immediate)

| Alert                | Condition                    | Severity |
| -------------------- | ---------------------------- | -------- |
| `v4_api_down`        | availability < 99% for 5 min | P0       |
| `v4_error_spike`     | 5xx rate > 5% for 5 min      | P0       |
| `hsm_unavailable`    | HSM error rate > 1%          | P0       |
| `audit_chain_broken` | Merkle verification failed   | P0       |
| `p0_bug_reported`    | New P0 bug created           | P0       |
| `data_corruption`    | Any data integrity alert     | P0       |

### Warning Alerts (Slack #v4-alerts)

| Alert                 | Condition                  | Severity |
| --------------------- | -------------------------- | -------- |
| `v4_latency_high`     | p99 > 2x SLO for 15 min    | P1       |
| `llm_degraded`        | LLM latency > 5s           | P1       |
| `adoption_stalled`    | No new migrations in 48h   | P1       |
| `error_rate_elevated` | Error rate > 1% for 30 min | P1       |
| `capacity_warning`    | Any resource > 80%         | P1       |
| `bug_backlog_growing` | Open bugs > 50             | P1       |

### Informational Alerts (Slack #v4-metrics)

| Alert                    | Condition                  | Frequency |
| ------------------------ | -------------------------- | --------- |
| `daily_adoption_summary` | Daily at 9 AM              | Daily     |
| `weekly_metrics_report`  | Monday 9 AM                | Weekly    |
| `milestone_reached`      | Key metric target met      | Event     |
| `feature_enabled`        | New tenant enables feature | Event     |

---

## 9. Dashboard Layout

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Summit v4.0 Rollout - Executive Dashboard                      [L+7 Days]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  ADOPTION   │  │  STABILITY  │  │ PERFORMANCE │  │  FEEDBACK   │        │
│  │    45%      │  │   99.9%     │  │    GREEN    │  │  NPS: 62    │        │
│  │  ▲ +5%      │  │  ● Healthy  │  │  p99: 450ms │  │  ▲ +8       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐      │
│  │ Migration Progress            │  │ Feature Adoption               │      │
│  │ [===================>    ] 75%│  │ AI: 30%  Compliance: 25%       │      │
│  └───────────────────────────────┘  └───────────────────────────────┘      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │ Key Metrics Trend (14 days)                                        │     │
│  │ [Chart: Adoption, Errors, NPS over time]                           │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Summit v4.0 Rollout - Operations Dashboard                   [Live]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Service Health          │  Error Rates              │  Latency (p99)      │
│  ┌───────────────────┐   │  ┌───────────────────┐    │  ┌─────────────────┐│
│  │ API       ● 99.9% │   │  │ 5xx:  0.05%       │    │  │ API:     450ms  ││
│  │ AI        ● 99.7% │   │  │ 4xx:  2.1%        │    │  │ AI:      4.2s   ││
│  │ Comply    ● 99.9% │   │  │ AI:   0.3%        │    │  │ Comply:  18s    ││
│  │ HSM       ● 100%  │   │  │ HSM:  0.01%       │    │  │ HSM:     85ms   ││
│  └───────────────────┘   │  └───────────────────┘    │  └─────────────────┘│
│                                                                             │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐│
│  │ Request Rate (rps)                  │  │ Active Incidents               ││
│  │ [Real-time chart]                   │  │ P0: 0   P1: 1   P2: 3          ││
│  └────────────────────────────────────┘  └────────────────────────────────┘│
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Recent Alerts                                                           ││
│  │ 10:32 [WARN] LLM latency elevated (4.8s)                               ││
│  │ 09:15 [INFO] Customer ACME enabled AI suggestions                       ││
│  │ 08:00 [INFO] Daily report: 5 new migrations                            ││
│  └────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Metric Collection Implementation

### Prometheus Metrics (Application)

```typescript
// src/metrics/v4-rollout-metrics.ts

import { Counter, Gauge, Histogram } from "prom-client";

// Adoption Metrics
export const v4ApiCalls = new Counter({
  name: "summit_v4_api_calls_total",
  help: "Total v4 API calls",
  labelNames: ["endpoint", "method", "status", "tenant_id"],
});

export const v4FeatureEnabled = new Gauge({
  name: "summit_v4_feature_enabled",
  help: "Feature enabled per tenant",
  labelNames: ["feature", "tenant_id"],
});

export const v4MigrationStatus = new Gauge({
  name: "summit_v4_migration_status",
  help: "Migration status per tenant (0=not started, 1=in progress, 2=complete)",
  labelNames: ["tenant_id"],
});

// AI Service Metrics
export const aiSuggestionsGenerated = new Counter({
  name: "summit_ai_suggestions_generated_total",
  help: "AI policy suggestions generated",
  labelNames: ["tenant_id", "suggestion_type"],
});

export const aiExplanationsGenerated = new Counter({
  name: "summit_ai_explanations_generated_total",
  help: "Verdict explanations generated",
  labelNames: ["tenant_id", "audience", "cache_hit"],
});

export const aiAnomaliesDetected = new Counter({
  name: "summit_ai_anomalies_detected_total",
  help: "Behavioral anomalies detected",
  labelNames: ["tenant_id", "severity", "type"],
});

// Performance Metrics
export const apiLatency = new Histogram({
  name: "summit_v4_api_latency_seconds",
  help: "API request latency",
  labelNames: ["endpoint", "method"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const aiLatency = new Histogram({
  name: "summit_ai_operation_latency_seconds",
  help: "AI service operation latency",
  labelNames: ["operation"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const hsmLatency = new Histogram({
  name: "summit_hsm_operation_latency_seconds",
  help: "HSM operation latency",
  labelNames: ["operation", "provider"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.5],
});

// Error Metrics
export const v4Errors = new Counter({
  name: "summit_v4_errors_total",
  help: "v4 API errors",
  labelNames: ["endpoint", "error_type", "status_code"],
});
```

### Grafana Dashboard JSON

See `grafana/v4-rollout-dashboard.json` for complete dashboard configuration.

---

## 11. Data Retention

| Metric Type         | Resolution | Retention |
| ------------------- | ---------- | --------- |
| Raw metrics         | 15 seconds | 7 days    |
| 1-minute aggregates | 1 minute   | 30 days   |
| 1-hour aggregates   | 1 hour     | 1 year    |
| Daily summaries     | 1 day      | Forever   |

---

_Summit v4.0 Rollout Metrics Specification_
_Last Updated: January 2025_
