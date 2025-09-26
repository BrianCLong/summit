import sys
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[2]))

from ml.app.monitoring import (  # noqa: E402  pylint: disable=wrong-import-position
    DriftResult,
    EvidentlyDriftMonitor,
    get_metrics,
)


def build_reference_frame():
    return pd.DataFrame(
        {
            "feature": [0, 1, 0, 1, 0, 1, 0, 1],
            "target": [0, 1, 0, 1, 0, 1, 0, 1],
            "prediction": [0, 1, 0, 1, 0, 1, 0, 1],
        }
    )


def build_drifted_frame():
    return pd.DataFrame(
        {
            "feature": [5, 6, 5, 6, 5, 6, 5, 6],
            "target": [0, 1, 0, 1, 0, 1, 0, 1],
            "prediction": [1, 0, 1, 0, 1, 0, 1, 0],
        }
    )


def test_evidently_drift_monitor_records_prometheus_metrics():
    monitor = EvidentlyDriftMonitor(
        model_name="unit-test-model",
        target_column="target",
        prediction_column="prediction",
        numerical_features=["feature"],
        data_drift_threshold=0.2,
        performance_drop_threshold=0.2,
        monitored_metric="accuracy",
    )

    result = monitor.run(build_reference_frame(), build_drifted_frame())

    assert isinstance(result, DriftResult)
    assert result.data_drift_detected is True
    assert "data_drift" in result.alerts
    assert "performance_degradation" in result.alerts
    assert result.performance_drop["accuracy"] >= 1.0

    metrics_text = get_metrics().decode()
    assert "model_data_drift_share" in metrics_text
    assert "model_performance_value" in metrics_text
    assert "model_drift_alerts_total" in metrics_text
    assert "model_drift_last_run_timestamp" in metrics_text


def test_monitor_allows_data_only_configuration():
    monitor = EvidentlyDriftMonitor(
        model_name="data-only",
        numerical_features=["feature"],
        data_drift_threshold=0.1,
        performance_drop_threshold=0.2,
        problem_type="custom",
    )

    result = monitor.run(build_reference_frame(), build_drifted_frame())

    assert isinstance(result, DriftResult)
    assert result.data_drift_detected is True
    assert "data_drift" in result.alerts
    # No performance metrics should be recorded when problem_type is custom
    assert result.performance_by_metric == {}
