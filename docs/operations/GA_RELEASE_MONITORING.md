# GA Release Monitoring Guide

**Status:** Stable
**Owner:** On-Call SRE
**Last Updated:** 2026-03-04

This guide outlines the operational monitoring procedures for the first 24 hours of a General Availability (GA) release.

---

## 1. Monitoring Dashboards

Operators must keep the following Grafana dashboards open during and after the release:
- **[GA Core Dashboard](grafana_ga_core_dashboard.json):** Primary metrics for all GA-tier services.
- **[Error Rate Heatmap](dashboards/error_rate.json):** Per-service and per-endpoint error distributions.
- **[Platform Performance](dashboards/performance.json):** Latency and resource utilization (CPU/Memory).
- **[Database Health](dashboards/db_health.json):** Connection pools, query performance, and lock contention.

---

## 2. Watchlist (First 24 Hours)

### 2.1 API Health
- **Metric:** `api_request_duration_seconds` (P99)
- **Threshold:** Alert if > 2s sustained for 5 minutes.
- **Metric:** `api_http_requests_total` (5xx status)
- **Threshold:** Alert if > 1% of total traffic.

### 2.2 Background Job Processing
- **Queue Depth:** Monitor DLQ for Kafka/RabbitMQ.
- **Threshold:** Alert if queue depth increases by 20% over 10 minutes.
- **Processing Time:** Monitor worker job duration for regressions.

### 2.3 Resource Utilization
- **Memory:** Watch for leaks in the application layer (RSS usage trends).
- **CPU:** Check for throttling on container-level metrics.

---

## 3. Post-Release Alerting

### 3.1 Critical Alerts (P1)
- **"GA Service Down":** No healthy instances in target namespace.
- **"GA High Error Rate":** HTTP 5xx rate > 5% for 2 minutes.
- **"GA Latency Spike":** P99 latency > 3s for 1 minute.

### 3.2 Warning Alerts (P2)
- **"GA Elevated Error Rate":** HTTP 5xx rate > 2% for 10 minutes.
- **"GA Resource Saturation":** Memory/CPU usage > 80% for 30 minutes.

---

## 4. On-Call Responsibilities

- **Check-ins:** Release Captain to provide status updates every 2 hours via the release Slack channel.
- **Log Review:** Proactively review logs using Kibana/Loki for any anomalous patterns that may not trigger alerts.
- **SLO Review:** Check `slo-config.yaml` to ensure the release is not burning the error budget disproportionately.

---

## 5. Escalation Procedure

In the event of an alert:
1. **Acknowledge:** On-call SRE acknowledges the alert within 5 minutes.
2. **Initial Triage:** Determine if the issue is release-related (e.g., version mismatch, new feature error).
3. **Engage Lead:** If the issue persists for > 15 minutes, engage the Platform Engineering Lead.
4. **Initiate Rollback:** If the Go/No-Go criteria for a rollback are met, execute the [Rollback Playbook](../playbooks/ROLLBACK_PLAYBOOK.md).
