# Summit SLO & Error Budget Policy

## 1. Inventory of SLO-like Metrics

This policy is derived from the following existing configurations in the repository:

*   **SLO Definitions**: `observability/slo/slo.yaml`, `monitoring/hypercare-slos.yaml`
*   **Alert Rules**:
    *   `monitoring/prometheus/rules/enhanced-slo-alerts.yml` (Primary source for burn rates)
    *   `monitoring/prometheus/rules/budget.rules.yaml` (Resource/Cost budgets)
    *   `observability/prometheus/alerts/api-slo-burn.yaml`
*   **Metric Sources**: `server/src/monitoring/metrics.js`

## 2. Service Level Objectives (SLOs)

We define the following SLOs for the Summit platform. These are the binding targets for Engineering and SRE teams.

| Service Area | User Journey | SLI Definition | SLO Target | Window |
| :--- | :--- | :--- | :--- | :--- |
| **API (Global)** | General Availability | `http_requests_total{status!~"5.."}` / Total Requests | **99.9%** | 28 days |
| **API (Global)** | General Latency | `http_request_duration_seconds` (p95) | **≤ 350ms** | 28 days |
| **Graph** | Intelligence Query | `graph_query_latency_seconds` (p95) | **≤ 1.5s** | 28 days |
| **Ingest** | E2E Processing | Time from ingest to index | **≤ 5s** (p95) | 28 days |
| **Provenance** | Data Integrity | Bundle verification success rate | **100%** | 24 hours |
| **Security** | Policy Enforcement | Request denial rate (Guardrails) | **≤ 15%** | 24 hours |

> **Note**: The Security SLO is an upper bound; denial rates higher than 15% indicate either a misconfigured policy or an active attack, both requiring intervention.

## 3. Error Budgets & Math

The Error Budget is the inverse of availability. It represents the amount of unreliability we are willing to tolerate to prioritize velocity.

### Availability Budget (99.9%)

*   **Window**: 28 days (~40,320 minutes)
*   **Allowable Downtime**: 40.32 minutes (approx 40m 19s)
*   **Request Volume**: If we serve 10,000,000 requests/month:
    *   **Budget**: 10,000 failed requests allowed.

### Latency Budget (p95 ≤ 350ms)

*   **Definition**: 5% of requests are allowed to be slower than 350ms.
*   **Budget**: 5% of total requests.
*   **"Bad" Event**: Any request > 350ms.

### Burn Rates

We monitor how fast we are consuming the error budget.

| Burn Rate | Meaning | Time to Exhaust | Severity | Action |
| :--- | :--- | :--- | :--- | :--- |
| **1x** | Consuming perfectly at pace | 28 days | Info | None |
| **10x** | 1% error rate (for 99.9% SLO) | ~3 days | **Warning** | Investigate next business day |
| **14.4x** | ~1.5% error rate | ~2 days | **Critical** | **Page On-Call** (Wake up) |
| **100x** | 10% error rate | ~7 hours | **Critical** | **Page On-Call** (Immediate) |

## 4. Alerting Policy

Alerts are configured to fire based on Burn Rate, not just instantaneous errors, to avoid flapping.

### Key Alerts
*   `LatencyBurnRateFast`: P95 > 350ms for 2m (Critical)
*   `AvailabilityBurnRateFast`: Error rate > 2% for 2m (Critical)
*   `AvailabilityBurnRateSlow`: Error rate > 1% for 15m (Warning)
*   `ProvenanceVerifyFailures`: Any failure (Critical)

See `monitoring/prometheus/rules/enhanced-slo-alerts.yml` for implementation details.

## 5. Release Policy & Error Budget Gates

We enforce the following policies based on remaining Error Budget:

### Policy: The "Red" State
**Trigger**: < 20% of Error Budget remaining for the rolling 28-day window.

**Consequences**:
1.  **Release Freeze**: No new features deployed to Production.
2.  **Focus Shift**: Engineering sprints pivot to Reliability & Tech Debt.
3.  **Exception**: Only critical security patches or reliability fixes allowed.
4.  **Exit Criteria**: Budget recovers to > 30%.

### Policy: The "Yellow" State
**Trigger**: < 50% of Error Budget remaining.

**Consequences**:
1.  **Review**: Post-mortem of recent incidents required before next release.
2.  **Gate**: Non-critical releases require VP/Director approval.

### Monitoring the Budget
Teams should check the **GA-SLO Dashboard** (`monitoring/dashboards/ga-slo.json`) before cutting a release.

## 6. Dashboards

*   **Executive View**: `GA-Core Operations Overview`
*   **Detailed SLOs**: `monitoring/dashboards/ga-slo.json`
*   **Budget Burn**: `monitoring/grafana/dashboards/conductor-slo-burn.json`
