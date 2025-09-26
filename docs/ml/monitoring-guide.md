# ML Model Drift & Performance Monitoring Guide

This guide explains how to enable Evidently-powered drift monitoring inside the Summit ML engine, export metrics to Prometheus, and visualise the results in Grafana.

## 1. Install dependencies

The ML service now requires [pandas](https://pandas.pydata.org/) and [Evidently AI](https://www.evidentlyai.com/). If you use Poetry run:

```bash
cd ml
poetry install
```

The `pyproject.toml` file pins compatible versions (`pandas ^2.1.4`, `evidently ^0.5.1`, `numpy >=1.26,<2.0`). Ensure these libraries are available inside any deployment image.

## 2. Wiring the Evidently drift monitor

Create an instance of `EvidentlyDriftMonitor` and call it whenever you have a new batch of inference telemetry. The monitor updates Prometheus gauges and counters through `record_drift_metrics`.

```python
import pandas as pd
from ml.app.monitoring import EvidentlyDriftMonitor

monitor = EvidentlyDriftMonitor(
    model_name="entity_resolver",
    target_column="label",
    prediction_column="prediction",
    numerical_features=["score", "degree"],
    data_drift_threshold=0.3,
    performance_drop_threshold=0.15,
    monitored_metric="f1",
)

reference_df = pd.read_parquet("/models/entity_resolver/baseline.parquet")
current_df = pd.DataFrame(records_from_stream)

monitor.run(reference_df, current_df)
```

### What gets recorded

* `model_data_drift_share`, `model_data_drift_columns`, `model_data_drift_detected`, `model_drift_last_run_timestamp`, `model_drift_threshold`
* `model_performance_value` (current vs. reference accuracy/precision/recall/F1/etc.)
* `model_performance_drop_ratio` (relative delta between reference and current metrics)
* `model_drift_alerts_total` (increments whenever Evidently raises `data_drift` or `performance_degradation`)

Metrics are tagged with `model_name` for multi-model deployments. `record_drift_metrics` also emits Prometheus `errors_total` entries if recording fails so operational alerts are still visible.

## 3. Exposing metrics via Prometheus

The `ml/monitoring/prometheus.yml` file defines a scrape configuration that targets the ML engine at `ml-engine:8000/metrics` and loads the alert rules:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - alert.rules.yml

scrape_configs:
  - job_name: ml-engine
    metrics_path: /metrics
    static_configs:
      - targets: ['ml-engine:8000']
        labels:
          service: ml-engine
          env: production
```

Deploy this configuration alongside the rest of your observability stack. For local testing you can run:

```bash
cd ml/monitoring
prometheus --config.file=prometheus.yml
```

The accompanying `ml/monitoring/alert.rules.yml` file ships alert definitions for:

* **MLModelDataDriftWarning** – share of drifted columns > 30% for 5 minutes.
* **MLModelDataDriftCritical** – Evidently has flipped the `model_data_drift_detected` flag for 10 minutes.
* **MLModelPerformanceRegression** – F1 score dropped by more than 20% vs. baseline.
* **MLModelRepeatedAlerts** – more than three alerts fired within 30 minutes.

Route these alerts to PagerDuty/Slack as appropriate through your Prometheus Alertmanager.

## 4. Grafana dashboard

Import `ml/monitoring/grafana/ml-model-monitoring.json` into Grafana. The dashboard includes:

1. **Data Drift Share** timeseries with threshold markers at 30% and 50%.
2. **Performance Drop Ratio** timeseries grouped by metric name.
3. **Current vs Reference Metrics** table for quick comparison of Evidently outputs.
4. **Drift Alerts (6h)** stat panel showing alert frequency.
5. **Last Drift Evaluation** stat panel rendering timestamps as ISO datetime values.

The dashboard provides a `model` variable sourced from `label_values(model_data_drift_share, model_name)` to switch between models. Update the default data source (`Prometheus`) to match your environment if needed.

## 5. Automation ideas

* Run the monitor on a schedule (e.g., Celery beat) using streaming data windows.
* Feed drift alerts into your incident workflow by scraping `model_drift_alerts_total` or using the bundled Prometheus alerts.
* Persist Evidently JSON reports for auditability if regulators require historical drift traces.

## 6. Testing

A pytest suite (`ml/tests/test_drift_monitor.py`) exercises the Evidently integration, ensuring drift metrics and alerts are emitted when synthetic drift is introduced. Run:

```bash
pytest ml/tests/test_drift_monitor.py
```

This validates both Prometheus surface area and the data-plane plumbing that the dashboard and Prometheus rules rely upon.

---

With these artefacts in place you get continuous visibility into model stability and can respond proactively to data quality or performance regressions.
