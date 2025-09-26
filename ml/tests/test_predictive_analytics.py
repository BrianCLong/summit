"""Tests for predictive analytics forecasting pipeline."""

import math
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List

# Ensure the ml/app package is discoverable when tests execute from repo root
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.predictive_analytics import (
    GraphTimeSeriesForecaster,
    PredictiveAnalyticsService,
)


def _synthetic_series(length: int) -> List[float]:
    return [math.sin(idx / 3.0) + idx * 0.1 for idx in range(length)]


def test_graph_time_series_forecaster_generates_predictions():
    series = _synthetic_series(24)
    forecaster = GraphTimeSeriesForecaster(lags=4, horizon=5, n_trials=3, random_state=7)

    metrics = forecaster.fit(series)
    predictions = forecaster.forecast(series)

    assert len(predictions) == 5
    assert metrics["rmse"] >= 0
    assert metrics["mae"] >= 0
    # r2 can be negative for poor fits but should be a finite number
    if metrics["r2"] is not None:
        assert math.isfinite(metrics["r2"])


class _StubFetcher:
    def __init__(self, start: datetime):
        self.start = start

    def fetch_node_attribute_series(self, node_id: str, attribute: str, lookback_hours=None):
        base = self.start
        points = []
        for idx, value in enumerate(_synthetic_series(30)):
            points.append((base + timedelta(hours=idx), float(value)))
        return points


def test_predictive_service_returns_forecast_payload():
    fetcher = _StubFetcher(datetime(2024, 1, 1, tzinfo=timezone.utc))
    service = PredictiveAnalyticsService(fetcher, default_trials=2, default_lags=4)

    forecast = service.forecast_node_attribute(
        node_id="node-123",
        attribute="activity_score",
        horizon=4,
        lags=4,
        lookback_hours=72,
        optuna_trials=2,
    )

    assert forecast["node_id"] == "node-123"
    assert forecast["attribute"] == "activity_score"
    assert len(forecast["predictions"]) == 4
    assert len(forecast["history"]) >= 20
    assert forecast["model"] == "RandomForestRegressor"
    assert set(forecast["metrics"].keys()) == {"rmse", "mae", "r2"}
    assert all(param in forecast["parameters"] for param in ("n_estimators", "max_depth"))
