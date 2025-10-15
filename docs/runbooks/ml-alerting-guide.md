# ML Observability Alerting Guide

## Overview
This guide documents how Summit monitors machine learning services, the alerting thresholds applied in Prometheus, and how PagerDuty escalations are configured. Use it as the single source of truth for on-call response to ML-specific incidents.

## Metrics & Dashboards
- **Inference latency** (`ml_inference_latency_seconds_bucket`): visualized as the "ML p95 Inference Latency (5m)" stat panel and trend lines on the IntelGraph Overview dashboard.
- **Model accuracy** (`ml_model_accuracy_score`, `ml_model_accuracy_target`): compared via the "Model Accuracy vs Target" panel with 1h rolling averages.
- **Data drift** (`ml_data_drift_score`): summarized via a 30-minute average stat card and historical trend chart for context.
- **Throughput & failures** (`ml_inference_requests_total`, `ml_inference_failures_total`): rendered as the "Inference Throughput vs Errors" timeseries to correlate load with error spikes.

Access the panels in Grafana: *Dashboards → IntelGraph Overview → ML Observability row*. Filter by model using the **Model** template variable.

## Alert Inventory
### Model Accuracy Drift
- **Source rule**: `ModelAccuracyDrift` in `ops/prometheus/prometheus-ml-alerts.yaml`.
- **Trigger**: 1h rolling accuracy drops >5 percentage points below the declared target for 15 minutes.
- **Impact**: Predictions may no longer meet product quality or contractual SLAs.
- **Immediate actions**:
  1. Validate data freshness and upstream feature pipelines.
  2. Compare recent training/validation metrics; roll back if a bad model was promoted.
  3. Engage the data science owner if accuracy continues to degrade after mitigation.

### Inference Latency
- **Source rule**: `ModelInferenceLatencyHigh` in `ops/prometheus/prometheus-ml-alerts.yaml`.
- **Trigger**: p95 latency > 750ms for 10 minutes in production.
- **Impact**: Customer-visible slow responses and potential timeout breaches.
- **Immediate actions**:
  1. Check Grafana panel for concurrency spikes and upstream dependency saturation.
  2. Inspect accelerator (GPU/Inferentia) utilization; fail over to warm replicas if needed.
  3. Confirm autoscaling targets; manually scale if queue backlog is rising.

### Data Drift
- **Source rule**: `ModelDataDriftHigh` in `ops/prometheus/prometheus-ml-alerts.yaml`.
- **Trigger**: 30m average drift score > 0.7.
- **Impact**: Model input distributions have shifted; accuracy degradation likely.
- **Immediate actions**:
  1. Inspect latest drift report for top-changing features.
  2. Validate data ingestion and labeling freshness.
  3. Coordinate with analytics to schedule retraining or hotfix rules.

## PagerDuty Routing
- Alerts are labeled with `component=ml-observability` and `service=ml-platform`.
- Alertmanager routes these to the **ml-pagerduty** receiver (see `monitoring/alertmanager/sre-policy.yml`).
- PagerDuty service configuration lives in `ops/alerts/pagerduty-ml-service.yaml` using the `PAGERDUTY_ML_ROUTING_KEY` secret.
- Incidents page the ML primary, with SRE as secondary. Stakeholders `#ml-ops` and `#sre-alerts` are auto-subscribed.

## Runbook Links
- Accuracy drift: <https://runbooks.summit.ai/ml-alerting-guide#model-accuracy-drift>
- Latency response: <https://runbooks.summit.ai/ml-alerting-guide#inference-latency>
- Data drift: <https://runbooks.summit.ai/ml-alerting-guide#data-drift>

## Post-Incident Checklist
1. Capture Grafana panel snapshots for accuracy, latency, and drift.
2. Tag the PagerDuty incident with `ml` and `customer-impact` as applicable.
3. File follow-up issues for model retraining or platform fixes.
4. Update this document with any new remediation steps discovered.
