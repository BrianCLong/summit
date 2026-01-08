# Optimization Metrics & Trade-off Constitution

**Status:** Active
**Owner:** Optimization Systems Lead (Jules)
**Last Updated:** Sprint N+34

This document defines the unified metric set for the **Continuous Optimization Loop**. It establishes the "shared truth" for Performance, Cost, and Safety, and defines the acceptable trade-off envelopes.

## 1. Unified Metric Set

All optimization efforts must measure impact against these three dimensions simultaneously.

### ⚡ Performance (Latency & Throughput)

_Goal: Minimize latency, maximize throughput._

| Metric ID         | Name            | Source                                             | Target (P95) | Critical Limit | Owner         |
| ----------------- | --------------- | -------------------------------------------------- | ------------ | -------------- | ------------- |
| `perf_api_p95`    | API Latency P95 | `api_performance.latency.p95_ms`                   | ≤ 285ms      | > 350ms        | API Platform  |
| `perf_graph_p95`  | Graph 3-Hop P95 | `neo4j_performance.query_latency.three_hop_p95_ms` | ≤ 285ms      | > 1200ms       | Data Platform |
| `perf_throughput` | API Throughput  | `api_performance.throughput.requests_per_second`   | ≥ 207.5 RPS  | < 100 RPS      | API Platform  |

### 💰 Cost (Efficiency & Scale)

_Goal: Minimize cost per unit of value._

| Metric ID          | Name               | Source                                                           | Target   | Critical Limit | Owner          |
| ------------------ | ------------------ | ---------------------------------------------------------------- | -------- | -------------- | -------------- |
| `cost_per_req`     | Cost Per Request   | `cost_management.daily_rates.cost_per_request_cents`             | ≤ $0.012 | > $0.020       | FinOps         |
| `cost_hourly`      | Total Hourly Cost  | `cost_management.daily_rates.hourly_cost_usd`                    | ≤ $24.00 | > $30.00       | FinOps         |
| `cost_storage_eff` | Storage Efficiency | `cost_management.resource_efficiency.storage_efficiency_percent` | ≥ 85.8%  | < 75%          | Infrastructure |

### 🛡️ Safety (Reliability & Security)

_Goal: Maintain invariants and zero-trust posture._

| Metric ID         | Name                | Source                                                         | Target   | Critical Limit      | Owner       |
| ----------------- | ------------------- | -------------------------------------------------------------- | -------- | ------------------- | ----------- |
| `safe_error_rate` | API Error Rate      | `api_performance.reliability.error_rate_percent`               | ≤ 0.008% | > 0.1%              | Reliability |
| `safe_auth_deny`  | Policy Deny Rate    | `auth_security.authorization.policy_metrics.deny_rate_percent` | ~12.5%   | < 5% (Check Policy) | Security    |
| `safe_invariant`  | Invariant Pass Rate | CI/CD Gate                                                     | 100%     | < 100%              | QA/Security |

---

## 2. Regression Matrices (Trade-off Envelopes)

Optimizations are only permitted if they satisfy the following trade-off logic.

### ✅ Allowed Scenarios

| Optimization Target     | Condition                    | Requirement               |
| ----------------------- | ---------------------------- | ------------------------- |
| **Improve Performance** | Cost is Stable/Lower         | Safety Invariants == PASS |
| **Reduce Cost**         | Performance is Stable/Better | Safety Invariants == PASS |
| **Increase Safety**     | Performance > Critical Limit | Cost < Critical Limit     |

### ❌ Forbidden Scenarios (Requires Executive Override)

1.  **"Cheap but Risky"**: Reducing Cost by disabling Safety checks.
2.  **"Fast but Loose"**: Improving Performance by bypassing OPA policies or validation.
3.  **"Safe but Unusable"**: Increasing Safety such that Performance breaches Critical Limits.

---

## 3. Threshold Definitions

- **Target**: The desired operating zone. Green status.
- **Warning Zone**: Between Target and Critical Limit. Optimization Suggested.
- **Critical Limit**: Service Level Objective (SLO) breach. P0 Incident or Blocking Regression.

## 4. Signal Sources

Metrics are sourced from `KPI_BASELINES.yaml` which aggregates data from:

- Prometheus (Runtime Metrics)
- Kubecost (Cost Estimates)
- CI/CD Artifacts (Invariant Tests)
