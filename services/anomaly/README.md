# Anomaly Detection Engine

The anomaly detection service provides production-grade intelligence across metrics, logs, and user behavior streams.
It exposes a FastAPI application with the following core capabilities:

- Adaptive thresholding backed by robust MAD statistics.
- Multi-detector support (`ewma`, `mad`, `zscore`, and graph rarity heuristics).
- Feature correlation analysis for context-aware alerting.
- Root cause suggestion strings that highlight contributing signals.
- Automated incident construction with configurable cooldowns and alert channels.
- False-positive suppression heuristics to keep operators focused on high-value signals.
- Trend analysis and short-term forecasting to anticipate future spikes.
- Model evaluation metrics (precision, recall, f1, accuracy) on labelled payloads.
- An alerting integration surface that can be wired to PagerDuty, Slack, or other transports.

## Configuration Workflow

1. POST `/anomaly/config` with one or more detector configurations. Each configuration describes the
   detector family, threshold strategy, adaptive sensitivity, and optional alert routing.
2. POST `/anomaly/score` with the telemetry batch to analyse. Optionally provide labelled ground truth (`labels`)
   and a prediction horizon to receive multi-step forecasts.
3. GET `/anomaly/alerts` to retrieve the incidents the engine dispatched through the alerting client.

Example configuration payload:

```json
{
  "configs": [
    {
      "model_id": "metrics-v1",
      "model_version": "1.0",
      "detector": "zscore",
      "params": {
        "mean": [100, 5],
        "std": [5, 1],
        "threshold": 1.5
      },
      "threshold_strategy": "adaptive",
      "adaptive_sensitivity": 2.5,
      "history_window": 64,
      "cooldown": 1,
      "alert_channels": ["pagerduty", "slack"]
    }
  ]
}
```

## Testing

Run the service unit tests directly with pytest:

```bash
pytest services/anomaly/test_anomaly.py
```

The tests cover adaptive thresholds, correlation output, incident lifecycle, cooldown enforcement, and error handling.
