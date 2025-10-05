"""Core anomaly detection engine orchestration utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Iterable, Sequence

import numpy as np

from .detectors import DetectorConfig, DetectorResult, score_records


@dataclass
class Incident:
    """Represents a synthesized incident created from anomalies."""

    model_id: str
    severity: str
    count: int
    score: float
    top_features: list[str]
    root_cause: str
    alert_channels: list[str]
    correlation_insights: dict[str, list[str]] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_id": self.model_id,
            "severity": self.severity,
            "count": self.count,
            "score": self.score,
            "top_features": self.top_features,
            "root_cause": self.root_cause,
            "alert_channels": self.alert_channels,
            "correlation_insights": self.correlation_insights or {},
        }


@dataclass
class TrendReport:
    classification: str
    slope: float
    intercept: float
    confidence: float

    def to_dict(self) -> dict[str, float | str]:
        return {
            "classification": self.classification,
            "slope": self.slope,
            "intercept": self.intercept,
            "confidence": self.confidence,
        }


@dataclass
class PredictionReport:
    horizon: int
    forecast: list[float]

    def to_dict(self) -> dict[str, Any]:
        return {"horizon": self.horizon, "forecast": self.forecast}


@dataclass
class EvaluationReport:
    precision: float
    recall: float
    f1: float
    support: int
    accuracy: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "precision": self.precision,
            "recall": self.recall,
            "f1": self.f1,
            "support": self.support,
            "accuracy": self.accuracy,
        }


class AdaptiveThreshold:
    """Adaptive threshold using a robust MAD driven strategy."""

    def __init__(self, base: float, sensitivity: float, window: int = 512, min_samples: int = 10) -> None:
        self.base = base
        self.sensitivity = sensitivity
        self.window = window
        self.min_samples = min_samples
        self.history: Deque[float] = deque(maxlen=window)

    def update(self, scores: Sequence[float]) -> float:
        if not scores:
            return self.base
        self.history.extend(float(score) for score in scores)
        if len(self.history) < self.min_samples:
            return self.base
        arr = np.asarray(self.history, dtype=float)
        median = float(np.median(arr))
        mad = float(np.median(np.abs(arr - median))) or 1e-6
        adaptive = median + self.sensitivity * mad
        self.base = max(1e-6, 0.6 * self.base + 0.4 * adaptive)
        return self.base


class CorrelationAnalyzer:
    def __init__(self, min_correlation: float = 0.7) -> None:
        self.min_correlation = min_correlation

    def analyze(self, matrix: np.ndarray, feature_names: Sequence[str]) -> dict[str, list[str]]:
        if matrix.size == 0 or matrix.shape[0] < 2 or matrix.shape[1] < 2:
            return {}
        corr = np.corrcoef(matrix, rowvar=False)
        correlations: dict[str, list[str]] = {}
        for i, name in enumerate(feature_names):
            correlated: list[str] = []
            for j, other in enumerate(feature_names):
                if i == j:
                    continue
                coeff = corr[i, j]
                if np.isnan(coeff):
                    continue
                if abs(coeff) >= self.min_correlation:
                    correlated.append(other)
            if correlated:
                correlations[name] = correlated
        return correlations


class TrendAnalyzer:
    def evaluate(self, values: Sequence[float]) -> TrendReport:
        if len(values) < 3:
            last_value = float(values[-1]) if values else 0.0
            return TrendReport("insufficient-data", 0.0, last_value, 0.0)
        idx = np.arange(len(values), dtype=float)
        series = np.asarray(list(values), dtype=float)
        slope, intercept = np.polyfit(idx, series, 1)
        std = float(np.std(series)) or 1e-6
        norm_slope = slope / std
        if norm_slope > 0.15:
            classification = "increasing"
        elif norm_slope < -0.15:
            classification = "decreasing"
        else:
            classification = "stable"
        confidence = min(1.0, abs(norm_slope))
        return TrendReport(classification, float(slope), float(intercept), confidence)


class LinearPredictor:
    def predict(self, values: Sequence[float], horizon: int = 3) -> PredictionReport:
        if horizon <= 0:
            return PredictionReport(horizon=0, forecast=[])
        if not values:
            return PredictionReport(horizon=horizon, forecast=[0.0] * horizon)
        if len(values) == 1:
            return PredictionReport(horizon=horizon, forecast=[float(values[0])] * horizon)
        idx = np.arange(len(values), dtype=float)
        series = np.asarray(list(values), dtype=float)
        slope, intercept = np.polyfit(idx, series, 1)
        forecast = [float(intercept + slope * (len(values) + step)) for step in range(1, horizon + 1)]
        return PredictionReport(horizon=horizon, forecast=forecast)


class AlertingClient:
    """Abstract alerting client."""

    def send(self, incident: Incident) -> None:  # pragma: no cover - interface
        raise NotImplementedError


class InMemoryAlertingClient(AlertingClient):
    def __init__(self) -> None:
        self.events: list[Incident] = []

    def send(self, incident: Incident) -> None:
        self.events.append(incident)


class RootCauseGenerator:
    """Generate human readable root cause suggestions."""

    KEYWORD_HINTS = {
        "latency": "Investigate upstream latency contributors or slow dependencies.",
        "error": "Elevated error counts detected; inspect recent deployments and logs.",
        "cpu": "CPU saturation detected; consider scaling or tuning workloads.",
        "memory": "Memory pressure observed; check leak suspects and cache limits.",
        "login": "User authentication anomalies; verify identity provider health.",
    }

    def build(self, record: dict[str, Any], features: Sequence[str]) -> str:
        if not features:
            return "Insufficient signal to infer root cause."
        hints: list[str] = []
        for feature in features:
            value = record.get(feature)
            hints.append(f"{feature}={value}")
            for keyword, message in self.KEYWORD_HINTS.items():
                if keyword in feature.lower():
                    hints.append(message)
                    break
        return ", ".join(hints)


class AnomalyEngine:
    """High level anomaly detection orchestrator."""

    def __init__(self, alert_client: AlertingClient | None = None) -> None:
        self._configs: dict[str, DetectorConfig] = {}
        self._thresholds: dict[str, AdaptiveThreshold | float] = {}
        self._history: dict[str, Deque[float]] = {}
        self._cooldowns: dict[str, int] = {}
        self._alert_client = alert_client or InMemoryAlertingClient()
        self._correlation_analyzer = CorrelationAnalyzer()
        self._trend_analyzer = TrendAnalyzer()
        self._predictor = LinearPredictor()
        self._root_cause = RootCauseGenerator()

    @property
    def alert_client(self) -> AlertingClient:
        return self._alert_client

    def configure(self, configs: Iterable[DetectorConfig]) -> int:
        count = 0
        for config in configs:
            self._configs[config.model_id] = config
            base_threshold = float(config.params.get("threshold", 1.0))
            if config.threshold_strategy == "adaptive":
                self._thresholds[config.model_id] = AdaptiveThreshold(
                    base=base_threshold,
                    sensitivity=config.adaptive_sensitivity,
                    window=config.history_window,
                )
            else:
                self._thresholds[config.model_id] = base_threshold
            self._history[config.model_id] = deque(maxlen=config.history_window)
            self._cooldowns[config.model_id] = 0
            count += 1
        return count

    def score(
        self,
        model_id: str,
        records: list[dict[str, Any]],
        threshold_override: float | None = None,
        labels: Sequence[int] | None = None,
        prediction_horizon: int = 3,
    ) -> dict[str, Any]:
        if model_id not in self._configs:
            raise KeyError(f"Unknown model_id '{model_id}'")

        config = self._configs[model_id]
        detector_result = score_records(records, config)

        threshold_value = self._resolve_threshold(model_id, detector_result.scores, threshold_override)

        anomalies, suppressed = self._build_anomalies(
            records, detector_result, threshold_value, config
        )

        correlations = self._correlation_analyzer.analyze(
            detector_result.feature_matrix, detector_result.feature_names
        )

        incidents = self._maybe_create_incident(
            model_id=model_id,
            config=config,
            anomalies=anomalies,
            threshold=threshold_value,
            correlations=correlations,
        )

        self._update_history(model_id, detector_result, records)
        trend = self._trend_analyzer.evaluate(self._history[model_id])
        prediction = self._predictor.predict(self._history[model_id], horizon=prediction_horizon)

        evaluation = (
            self._evaluate(detector_result.scores, labels, threshold_value).to_dict()
            if labels is not None
            else None
        )

        return {
            "scores": detector_result.scores,
            "threshold": threshold_value,
            "anomalies": anomalies,
            "incidents": [incident.to_dict() for incident in incidents],
            "correlations": correlations,
            "trend": trend.to_dict(),
            "prediction": prediction.to_dict(),
            "evaluation": evaluation,
            "false_positive_reduction": {"suppressed": suppressed},
            "history_size": len(self._history[model_id]),
        }

    def _resolve_threshold(
        self,
        model_id: str,
        scores: Sequence[float],
        threshold_override: float | None,
    ) -> float:
        if threshold_override is not None:
            return float(threshold_override)

        threshold_cfg = self._thresholds[model_id]
        if isinstance(threshold_cfg, AdaptiveThreshold):
            return threshold_cfg.update(scores)
        return float(threshold_cfg)

    def _build_anomalies(
        self,
        records: Sequence[dict[str, Any]],
        detector_result: DetectorResult,
        threshold: float,
        config: DetectorConfig,
    ) -> tuple[list[dict[str, Any]], int]:
        anomalies: list[dict[str, Any]] = []
        suppressed = 0
        min_ratio = float(config.params.get("min_score_ratio", 0.05))

        for idx, score in enumerate(detector_result.scores):
            if score <= threshold:
                continue
            rationale_features = detector_result.rationales[idx]
            root_cause = self._root_cause.build(records[idx], rationale_features)
            anomaly = {
                "index": idx,
                "score": float(score),
                "record": {
                    feature: records[idx].get(feature) for feature in detector_result.feature_names
                },
                "rationale": {
                    "features": rationale_features,
                    "details": {feature: records[idx].get(feature) for feature in rationale_features},
                },
                "root_cause": root_cause,
                "impact_ratio": (score - threshold) / (threshold + 1e-6),
            }
            if anomaly["impact_ratio"] < min_ratio:
                suppressed += 1
                continue
            anomalies.append(anomaly)
        return anomalies, suppressed

    def _maybe_create_incident(
        self,
        model_id: str,
        config: DetectorConfig,
        anomalies: Sequence[dict[str, Any]],
        threshold: float,
        correlations: dict[str, list[str]],
    ) -> list[Incident]:
        incidents: list[Incident] = []
        if not anomalies or not config.auto_incident:
            self._cooldowns[model_id] = max(0, self._cooldowns[model_id] - 1)
            return incidents

        if self._cooldowns[model_id] > 0:
            self._cooldowns[model_id] -= 1
            return incidents

        strongest = max(anomalies, key=lambda item: item["score"])
        ratio = strongest["score"] / (threshold + 1e-6)
        if ratio > 3:
            severity = "critical"
        elif ratio > 2:
            severity = "major"
        elif ratio > 1.2:
            severity = "minor"
        else:
            severity = "warning"

        incident = Incident(
            model_id=model_id,
            severity=severity,
            count=len(anomalies),
            score=float(strongest["score"]),
            top_features=list(strongest["rationale"]["features"]),
            root_cause=strongest["root_cause"],
            alert_channels=config.alert_channels,
            correlation_insights=correlations if correlations else None,
        )
        incidents.append(incident)
        self._alert_client.send(incident)
        self._cooldowns[model_id] = max(0, config.cooldown)
        return incidents

    def _update_history(
        self,
        model_id: str,
        detector_result: DetectorResult,
        records: Sequence[dict[str, Any]],
    ) -> Sequence[float]:
        series_values: list[float] = []
        if detector_result.feature_matrix.size == 0:
            series_values = [float(score) for score in detector_result.scores]
        else:
            for row in detector_result.feature_matrix:
                series_values.append(float(np.mean(row)))
        history = self._history[model_id]
        for value in series_values:
            history.append(value)
        return series_values

    def _evaluate(
        self,
        scores: Sequence[float],
        labels: Sequence[int],
        threshold: float,
    ) -> EvaluationReport:
        if len(scores) != len(labels):
            raise ValueError("labels length must match scores length")
        preds = [1 if score > threshold else 0 for score in scores]
        tp = sum(1 for pred, label in zip(preds, labels) if pred == 1 and label == 1)
        fp = sum(1 for pred, label in zip(preds, labels) if pred == 1 and label == 0)
        fn = sum(1 for pred, label in zip(preds, labels) if pred == 0 and label == 1)
        tn = sum(1 for pred, label in zip(preds, labels) if pred == 0 and label == 0)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        accuracy = (tp + tn) / len(scores) if scores else 0.0
        return EvaluationReport(
            precision=float(precision),
            recall=float(recall),
            f1=float(f1),
            support=int(sum(labels)),
            accuracy=float(accuracy),
        )
