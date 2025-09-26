"""Predictive analytics pipeline for graph node attribute forecasting."""

from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import optuna
import pandas as pd
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError
from neo4j.time import DateTime as Neo4jDateTime
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

logger = logging.getLogger(__name__)

# Reduce Optuna logging noise in production environments.
optuna.logging.set_verbosity(optuna.logging.WARNING)


TimestampValue = Tuple[datetime, float]


class Neo4jGraphDataClient:
    """Utility for fetching graph time-series data from Neo4j."""

    _TIMESTAMP_FIELDS: Sequence[str] = (
        "timestamp",
        "observedAt",
        "recordedAt",
        "createdAt",
        "updatedAt",
        "asOf",
        "date",
        "datetime",
        "time",
        "windowStart",
        "windowEnd",
    )
    _VALUE_FIELDS: Sequence[str] = (
        "value",
        "score",
        "amount",
        "metricValue",
        "currentValue",
        "count",
        "total",
        "trend",
        "measurement",
        "level",
    )

    def __init__(self, uri: str, user: str, password: str) -> None:
        self._uri = uri
        self._user = user
        self._password = password
        self._driver = None

    @property
    def driver(self):
        if self._driver is None:
            logger.info("Connecting to Neo4j for predictive analytics", extra={"uri": self._uri})
            self._driver = GraphDatabase.driver(self._uri, auth=(self._user, self._password))
        return self._driver

    def close(self) -> None:
        if self._driver is not None:
            logger.info("Closing Neo4j driver for predictive analytics")
            self._driver.close()
            self._driver = None

    def fetch_node_attribute_series(
        self,
        node_id: str,
        attribute: str,
        lookback_hours: Optional[int] = None,
    ) -> List[TimestampValue]:
        """Fetch a node attribute time series sorted by timestamp."""

        cypher = (
            "MATCH (n {id: $node_id})-[:HAS_METRIC|:HAS_MEASUREMENT|:RECORDED|:OBSERVED]->(m)\n"
            "WHERE $attribute IS NULL"
            " OR m.name = $attribute"
            " OR m.attribute = $attribute"
            " OR m.metric = $attribute\n"
            "RETURN properties(m) AS datapoint"
        )

        try:
            with self.driver.session() as session:
                records = session.run(cypher, {"node_id": node_id, "attribute": attribute})
                series: List[TimestampValue] = []
                for record in records:
                    properties = record.get("datapoint") or {}
                    ts = self._extract_timestamp(properties)
                    value = self._extract_value(properties)
                    if ts is None or value is None:
                        continue
                    series.append((ts, value))
        except Neo4jError as exc:
            logger.error(
                "Neo4j query for predictive analytics failed", extra={"nodeId": node_id, "attribute": attribute, "error": str(exc)}
            )
            raise

        if not series:
            logger.warning(
                "No historical data found for node attribute", extra={"nodeId": node_id, "attribute": attribute}
            )
            return []

        series.sort(key=lambda item: item[0])

        if lookback_hours:
            cutoff = series[-1][0] - timedelta(hours=lookback_hours)
            series = [item for item in series if item[0] >= cutoff]

        return series

    def _extract_timestamp(self, properties: Dict[str, Any]) -> Optional[datetime]:
        for field in self._TIMESTAMP_FIELDS:
            if field not in properties:
                continue
            raw_value = properties[field]
            if raw_value in (None, ""):
                continue
            parsed = self._to_datetime(raw_value)
            if parsed is not None:
                return parsed
        # Handle epoch-based timestamps if provided.
        for key in ("epochMillis", "epochMs", "epoch", "epochSeconds"):
            raw_value = properties.get(key)
            if raw_value is None:
                continue
            try:
                if "Millis" in key or key.endswith("Ms"):
                    return datetime.fromtimestamp(float(raw_value) / 1000.0, tz=timezone.utc)
                return datetime.fromtimestamp(float(raw_value), tz=timezone.utc)
            except (ValueError, TypeError):
                continue
        return None

    def _extract_value(self, properties: Dict[str, Any]) -> Optional[float]:
        for field in self._VALUE_FIELDS:
            if field not in properties:
                continue
            raw_value = properties[field]
            if raw_value in (None, ""):
                continue
            try:
                value = float(raw_value)
                if math.isnan(value):
                    continue
                return value
            except (ValueError, TypeError):
                continue
        return None

    def _to_datetime(self, raw: Any) -> Optional[datetime]:
        if isinstance(raw, datetime):
            if raw.tzinfo is None:
                return raw.replace(tzinfo=timezone.utc)
            return raw.astimezone(timezone.utc)
        if isinstance(raw, Neo4jDateTime):
            return raw.to_native().astimezone(timezone.utc)
        try:
            timestamp = pd.to_datetime(raw, utc=True, errors="coerce")
        except (ValueError, TypeError):
            return None
        if pd.isna(timestamp):
            return None
        native = timestamp.to_pydatetime()
        if native.tzinfo is None:
            native = native.replace(tzinfo=timezone.utc)
        else:
            native = native.astimezone(timezone.utc)
        return native


class GraphTimeSeriesForecaster:
    """Lag-based forecasting model with Optuna tuning."""

    def __init__(
        self,
        lags: int = 3,
        horizon: int = 6,
        n_trials: int = 10,
        random_state: int = 42,
        cv_splits: int = 3,
        timeout: Optional[int] = 30,
    ) -> None:
        self.lags = lags
        self.horizon = horizon
        self.n_trials = n_trials
        self.random_state = random_state
        self.cv_splits = cv_splits
        self.timeout = timeout
        self.model: Optional[RandomForestRegressor] = None
        self.best_params_: Dict[str, Any] = {}
        self.metrics_: Dict[str, Optional[float]] = {}

    @property
    def model_name(self) -> str:
        if self.model is None:
            return "RandomForestRegressor"
        return self.model.__class__.__name__

    def _build_features(self, values: Sequence[float]) -> Tuple[np.ndarray, np.ndarray]:
        data: List[List[float]] = []
        targets: List[float] = []
        for idx in range(self.lags, len(values)):
            window = list(values[idx - self.lags : idx])
            if len(window) < self.lags:
                continue
            data.append(window)
            targets.append(values[idx])
        if not data:
            raise ValueError("Not enough data points to build training features")
        return np.asarray(data, dtype=float), np.asarray(targets, dtype=float)

    def fit(self, values: Sequence[float]) -> Dict[str, Optional[float]]:
        if len(values) <= self.lags:
            raise ValueError("Not enough historical observations to train forecaster")

        X, y = self._build_features(values)
        if len(X) < 2:
            raise ValueError("Not enough samples for time-series cross validation")

        def objective(trial: optuna.Trial) -> float:
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 50, 200),
                "max_depth": trial.suggest_int("max_depth", 2, 12),
                "min_samples_split": trial.suggest_int("min_samples_split", 2, 8),
                "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 5),
            }
            model = RandomForestRegressor(
                random_state=self.random_state,
                n_jobs=-1,
                **params,
            )
            n_splits = min(self.cv_splits, len(X) - 1)
            if n_splits < 1:
                raise ValueError("Not enough data for cross-validation")
            splitter = TimeSeriesSplit(n_splits=n_splits)
            scores: List[float] = []
            for train_index, test_index in splitter.split(X):
                model.fit(X[train_index], y[train_index])
                preds = model.predict(X[test_index])
                rmse = mean_squared_error(y[test_index], preds, squared=False)
                scores.append(float(rmse))
            return float(np.mean(scores))

        study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=self.random_state))
        study.optimize(objective, n_trials=self.n_trials, timeout=self.timeout)

        self.best_params_ = {
            "n_estimators": study.best_params.get("n_estimators", 100),
            "max_depth": study.best_params.get("max_depth", 6),
            "min_samples_split": study.best_params.get("min_samples_split", 2),
            "min_samples_leaf": study.best_params.get("min_samples_leaf", 1),
        }

        self.model = RandomForestRegressor(
            random_state=self.random_state,
            n_jobs=-1,
            **self.best_params_,
        )
        self.model.fit(X, y)

        predictions = self.model.predict(X)
        self.metrics_ = {
            "rmse": float(mean_squared_error(y, predictions, squared=False)),
            "mae": float(mean_absolute_error(y, predictions)),
            "r2": float(r2_score(y, predictions)) if len(y) > 1 else None,
        }
        return self.metrics_

    def forecast(self, values: Sequence[float]) -> List[float]:
        if self.model is None:
            raise RuntimeError("Model has not been fitted")
        history = list(values)
        forecasts: List[float] = []
        for _ in range(self.horizon):
            if len(history) < self.lags:
                window = history
            else:
                window = history[-self.lags :]
            prediction = float(self.model.predict(np.asarray(window, dtype=float).reshape(1, -1))[0])
            forecasts.append(prediction)
            history.append(prediction)
        return forecasts


class PredictiveAnalyticsService:
    """High-level service that orchestrates data fetching and forecasting."""

    def __init__(
        self,
        fetcher: Neo4jGraphDataClient,
        default_trials: int = 10,
        default_lags: int = 3,
    ) -> None:
        self.fetcher = fetcher
        self.default_trials = default_trials
        self.default_lags = default_lags

    def forecast_node_attribute(
        self,
        node_id: str,
        attribute: str,
        horizon: int = 6,
        lags: Optional[int] = None,
        lookback_hours: Optional[int] = None,
        optuna_trials: Optional[int] = None,
    ) -> Dict[str, Any]:
        series = self.fetcher.fetch_node_attribute_series(node_id, attribute, lookback_hours=lookback_hours)
        if len(series) < 5:
            raise ValueError("Insufficient historical observations for forecasting")

        # Ensure chronological order and filter invalid entries.
        cleaned: List[TimestampValue] = []
        for ts, value in series:
            if ts is None:
                continue
            if value is None or math.isnan(value):
                continue
            cleaned.append((ts, float(value)))

        if len(cleaned) < 5:
            raise ValueError("Historical series did not contain enough valid observations")

        timestamps, values = zip(*cleaned)
        lags_to_use = lags or self.default_lags
        trials_to_use = optuna_trials or self.default_trials

        forecaster = GraphTimeSeriesForecaster(lags=lags_to_use, horizon=horizon, n_trials=trials_to_use)
        metrics = forecaster.fit(values)
        forecast_values = forecaster.forecast(values)

        interval = self._infer_interval(timestamps)
        future_timestamps = self._generate_future_timestamps(timestamps[-1], interval, horizon)

        parameter_payload = {key: float(value) for key, value in forecaster.best_params_.items()}

        history_payload = [
            {"timestamp": ts.astimezone(timezone.utc), "value": val}
            for ts, val in cleaned
        ]
        forecast_payload = [
            {"timestamp": ts.astimezone(timezone.utc), "value": val}
            for ts, val in zip(future_timestamps, forecast_values)
        ]

        return {
            "node_id": node_id,
            "attribute": attribute,
            "horizon": horizon,
            "model": forecaster.model_name,
            "metrics": metrics,
            "parameters": parameter_payload,
            "history": history_payload,
            "predictions": forecast_payload,
            "last_updated": history_payload[-1]["timestamp"],
        }

    def _infer_interval(self, timestamps: Sequence[datetime]) -> timedelta:
        if len(timestamps) < 2:
            return timedelta(hours=1)
        diffs = [
            (timestamps[idx] - timestamps[idx - 1]).total_seconds()
            for idx in range(1, len(timestamps))
        ]
        positive_diffs = [diff for diff in diffs if diff > 0]
        if not positive_diffs:
            return timedelta(hours=1)
        median_seconds = float(np.median(positive_diffs))
        return timedelta(seconds=median_seconds)

    def _generate_future_timestamps(
        self, last_timestamp: datetime, interval: timedelta, horizon: int
    ) -> List[datetime]:
        timestamps: List[datetime] = []
        current = last_timestamp
        for _ in range(horizon):
            current = current + interval
            timestamps.append(current)
        return timestamps
