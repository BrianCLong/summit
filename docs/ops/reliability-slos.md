# Reliability SLOs & Error Budgets

This document defines the initial reliability objectives for Summit's most visible capabilities. Targets are intentionally opinionated but small in scope to make them actionable. SLIs are derived from the current telemetry stack (Prometheus, Grafana, CloudWatch metrics where applicable) and should be iterated as new signals land.

## Scope and measurement
- **Measurement window:** Rolling 30 days.
- **Data sources:**
  - Prometheus scrape targets exposed via the existing monitoring-setup (see `docs/ops/monitoring-alerting-setup.md` for exporters).
  - Grafana dashboards for visualization (proposed panels in `docs/ops/slo-dashboards.md`).
  - CloudWatch application load balancer logs for external traffic where available.
- **Error budget accounting:** Error budget represents the allowable time the SLO can be violated within the window. Burning budget means accumulated errors/latency beyond the SLO target, consuming the allowance. When the budget is exhausted, the SLO is considered failed until the window recovers.
- **Alerting hooks:**
  - Page when **24h burn rate** would exhaust the monthly budget in < 4 days.
  - Ticket/Slack alert when **7d burn rate** would exhaust the monthly budget in < 15 days.

## SLOs

### 0) Critical services availability (GA requirement)
- **User capability:** Core services are available for authenticated requests.
- **SLI:** `1 - (sum(rate(http_requests_total{status=~"5..",service=~"summit|intelgraph-api|conductor"}[30d])) / sum(rate(http_requests_total{service=~"summit|intelgraph-api|conductor"}[30d])))`
- **SLO:** **≥ 99.5% success** over 30 days.
- **Error budget:** 0.5% of 30 days ≈ **3.6 hours/month**.
- **Ownership:** Platform SRE + service owners.
- **Notes:** Service labels must include `service` and status codes; align dashboards in Grafana to this SLI.

### 1) Graph query availability
- **User capability:** Users can successfully execute read queries via the primary API.
- **SLI:** Ratio of `2xx/3xx` responses over all query requests (`http_request_total{route="/graph/query"}`) excluding client `4xx`.
- **SLO:** **≥ 99.0% success** over 30 days.
- **Error budget:** 1.0% of 30 days ≈ **7.2 hours/month**.
- **Ownership:** API service + platform SRE.
- **Notes:** Backends should emit `graph_query_failure_total` counter for more granular diagnostics.

### 2) Workflow completion latency (Maestro/Conductor)
- **User capability:** Orchestrated jobs complete promptly after submission.
- **SLI:** P95 of end-to-end job latency (`workflow_completed_seconds` histogram) from enqueue to terminal status.
- **SLO:** **P95 ≤ 10 seconds** over 30 days.
- **Error budget:** Up to **10% of requests exceeding 10s** (i.e., 90th percentile may degrade) before SLO is considered failing.
- **Ownership:** Workflow/Conductor team.
- **Notes:** Consider segmenting by tenant to avoid one noisy customer burning the global budget.

### 3) Incident notification responsiveness
- **User capability:** On-call is notified and acknowledges customer-impacting incidents rapidly.
- **SLI:** Time from first SEV1/SEV2 alert to on-call acknowledgement in Slack/PagerDuty (`incident_ack_seconds` distribution, or Slack bot timestamp diff if manual).
- **SLO:** **Median ack ≤ 5 minutes; 90th percentile ≤ 10 minutes** over 30 days.
- **Error budget:** Up to **10% of SEV1/SEV2 alerts** may exceed 10 minutes before the SLO is considered failing.
- **Ownership:** Reliability engineering/on-call rotation coordinator.
- **Notes:** Track manually in incident docs until telemetry is automated.

## Managing error budgets

- **Burn tracking:** Include burn-rate panels per SLO and share during weekly ops review. When burn exceeds 25% of monthly allowance within a week, flag as yellow; ≥50% in a week is red.
- **Actions on budget exhaustion:**
  - Freeze risky changes (production deploys without explicit approval, schema changes) for the impacted service.
  - Add an action item to run a focused postmortem on the dominant contributors.
  - Escalate ownership if no remediation plan is in place within 48 hours.
- **Exit criteria:** Resume normal change cadence when the SLO has been met for two consecutive weeks and burn rate is <10% of monthly budget per week.

## Reporting cadence
- **Weekly ops review:** Present SLO trendlines, burn rate, and top incidents that consumed budget.
- **Monthly health check:** Confirm whether SLOs were met, whether error budgets reset, and whether changes are needed (targets, SLIs, alert thresholds).
- **Post-incident:** Each SEV1/SEV2 postmortem should note which SLO budgets were impacted and estimate burn.
