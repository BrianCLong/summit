# Monitoring & Observability Incident Runbook

## Purpose

Provide an operator checklist for restoring platform health when SLO alerts or anomaly detectors fire.

## Initial Triage

1. **Acknowledge alerts** in PagerDuty/Slack to stop paging noise. Capture alert names, firing labels, and timestamps.
2. **Identify the failing dimension**:
   - `BusinessSignupAnomaly` or `SignupZeroTraffic`
   - `ApiLatencySLOBreach` / `ApiErrorBudgetBurn`
   - `RevenueRunRateShortfall`
   - `CapacityCPUForecastCritical` or `CapacityMemoryForecastCritical`
3. **Check Grafana dashboard** `Infrastructure Monitoring & Business Observability` for correlated spikes or drops.

## Deep Dive by Alert

### BusinessSignupAnomaly / SignupZeroTraffic

- Verify marketing and auth endpoints are reachable: `curl -I https://app.$TENANT_DOMAIN/auth/health`.
- Check recent deploys to `maestro-api` or the public signup UI.
- Inspect ingress logs in Kibana for 4xx/5xx bursts.
- If signup traffic is blocked, enable maintenance banner and escalate to Growth engineering.

### ApiLatencySLOBreach / ApiErrorBudgetBurn

- Confirm Prometheus graph for `http_request_duration_seconds` and `http_requests_total`.
- Check Jaeger traces for the slowest endpoints (`service=maestro-api`).
- Validate database health via `kubectl exec` and running `SELECT 1` on Postgres / Neo4j.
- If latency is DB bound, scale replicas or enable read-only failover.

### RevenueRunRateShortfall

- Confirm `business:revenue_per_minute` is ingesting events.
- Check Stripe/webhook ingestion logs in Kibana.
- Trigger synthetic checkout via `/monitoring/metrics/business` with a small test event.
- Escalate to Finance if data loss confirmed.

### Capacity Forecast Alerts

- Open Grafana panel "Capacity Forecast (CPU)" for trendlines.
- Validate cluster autoscaler health.
- Create scaling ticket with predicted breach date and remediation plan.

## Auto Remediation Hooks

Health checks call the `evaluateHealthForRemediation` helper, which executes:

- Postgres pool recycle (logs only by default).
- Redis connection flush.
- Neo4j driver reset scheduling.
- ML service queue pause.

If a remediation fails repeatedly within five minutes, the associated counter `service_auto_remediations_total{result="failed"}` will appear in Prometheus; escalate to the owning team.

## Escalation Matrix

| Severity | Trigger                                         | Action                                                     |
| -------- | ----------------------------------------------- | ---------------------------------------------------------- |
| P1       | Persistent SLO breach (`severity=page`)         | Incident commander + platform + on-call for owning service |
| P2       | Revenue or signup anomalies (`severity=ticket`) | Create Jira incident, notify Finance/Growth                |
| P3       | Capacity forecast warnings                      | Create capacity planning issue, track in weekly Ops review |

## Post-Incident

1. Capture a timeline with metric snapshots and Grafana links.
2. File RCA doc in `/ops/runbooks` and link from the incident ticket.
3. Add missing alerts/dashboards as follow-up action items.
