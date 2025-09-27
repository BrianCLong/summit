# Alert Management Guide

## Purpose
This guide explains how to operate the IntelGraph alerting pipeline, including Prometheus rule updates, PagerDuty routing, and Grafana visualizations for alert history. Follow it during on-call rotations and incident reviews.

## Prometheus Rules
1. **Location**: `ops/prometheus/prometheus-rule-custom-alerts.yaml` and `ops/prometheus/prometheus-rule-slo.yaml`.
2. **Key Signals**:
   - `GraphQueryLatencyCritical` fires when p99 latency exceeds 2s for five minutes.
   - `MLInferenceErrorBudgetBurn` fires when realtime inference errors surpass 5% over ten minutes.
   - `GraphAPIAvailabilitySLOBreach` combines 5m/1h burn rates to protect the 99.5% availability SLO.
3. **Editing Workflow**:
   - Update rule files with 2-space indentation.
   - Validate syntax: `promtool check rules ops/prometheus/prometheus-rule-custom-alerts.yaml`.
   - Reload Prometheus (`SIGHUP` or `/-/reload`).

## PagerDuty Integration
1. **Configuration Example**: `ops/prometheus/alertmanager-pagerduty-example.yaml` shows the routing strategy.
2. **Routing Labels**:
   - `severity=page` targets PagerDuty.
   - `pagerduty_service` selects the PagerDuty service key.
   - `tier`, `component`, and `slo` map to PagerDuty fields for richer context.
3. **Secrets Management**:
   - Store routing keys in the `PagerDutyRoutingKey` secret or Kubernetes Secret resource.
   - Rotate keys every quarter or after personnel changes.
4. **Verification**:
   - Trigger a synthetic alert (e.g., `scripts/witness.sh`).
   - Confirm PagerDuty incident creation, Slack notification, and auto-resolve.

## Grafana Alert History
1. **Dashboard**: `ops/grafana/dashboards/intelgraph_slos.json` contains the “Alert History (24h)” panel.
2. **Usage**:
   - Filter by `alertname`, `service`, or `severity` to analyze incident volume.
   - Export table data for post-incident reviews.
3. **Customization**:
   - Adjust the query window (`[24h]`) to widen or narrow the lookback.
   - Add alert labels to the query to focus on specific environments.

## SLO Breach Response Checklist
1. Acknowledge the PagerDuty incident within five minutes.
2. Validate alert accuracy using Grafana panels and Prometheus queries.
3. Engage service owners and run mitigation playbooks (cache warmup, rollback, feature flag toggles).
4. Document root cause, timeline, and follow-up tasks in the incident tracker.

## Maintenance Cadence
- **Weekly**: Review alert noise, ensure thresholds match recent load tests.
- **Monthly**: Test PagerDuty routing with a synthetic event and rotate on-call schedules.
- **Quarterly**: Audit SLO definitions, confirm dashboards align with current SLIs, and archive stale alerts.
