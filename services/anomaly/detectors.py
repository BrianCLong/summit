"""Simple anomaly detectors used by the anomaly service."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, field_validator

import warnings

warnings.filterwarnings(
    "ignore",
    message='Field "model_id" has conflict with protected namespace "model_".',
)
warnings.filterwarnings(
    "ignore",
    message='Field "model_version" has conflict with protected namespace "model_".',
)


class DetectorConfig(BaseModel):
    """Configuration describing how to run a detector."""

    model_id: str
    model_version: str
    detector: str  # e.g. 'ewma', 'mad', 'zscore', 'graph'
    params: dict[str, Any] = Field(default_factory=dict)
    seed: int = 0
    stream_type: Literal["metrics", "logs", "user", "graph"] = "metrics"
    threshold_strategy: Literal["static", "adaptive"] = "adaptive"
    adaptive_sensitivity: float = 3.0
    history_window: int = 256
    cooldown: int = 0
    auto_incident: bool = True
    alert_channels: list[str] = Field(default_factory=list)
    model_config = ConfigDict(protected_namespaces=())

    @field_validator("adaptive_sensitivity")
    @classmethod
    def _positive_sensitivity(cls, value: float) -> float:  # noqa: D401
        """Ensure sensitivity is positive."""

        if value <= 0:
            raise ValueError("adaptive_sensitivity must be positive")
        return value



@dataclass
class DetectorResult:
    scores: list[float]
    rationales: list[list[str]]
    feature_matrix: np.ndarray
    feature_names: list[str]


def _top_features(
    values: np.ndarray,
    baseline: np.ndarray,
    names: Sequence[str],
    k: int = 3,
) -> list[str]:
    """Return feature names with the largest absolute deviation."""

    if len(names) == 0:
        return []
    deltas = np.abs(values - baseline)
    idx = np.argsort(deltas)[::-1][:k]
    return [names[i] for i in idx]


def _feature_matrix(
    records: Sequence[dict[str, Any]],
    feature_order: Sequence[str] | None = None,
) -> tuple[np.ndarray, list[str]]:
    """Extract a numeric feature matrix and its associated names."""

    if not records:
        return np.zeros((0, 0)), []

    if feature_order:
        numeric_features = [feature for feature in feature_order]
    else:
        numeric_features = [
            key for key, value in records[0].items() if isinstance(value, (int, float))
        ]
        numeric_features.sort()

    matrix = np.asarray(
        [[float(record.get(feature, 0.0)) for feature in numeric_features] for record in records],
        dtype=float,
    )
    return matrix, list(numeric_features)


def ewma_score(batch: np.ndarray, config: DetectorConfig) -> tuple[np.ndarray, list[list[str]]]:
    alpha = float(config.params.get("alpha", 0.3))
    baseline = np.asarray(
        config.params.get("baseline", np.zeros(batch.shape[1], dtype=float)),
        dtype=float,
    )
    ewma = alpha * batch + (1 - alpha) * baseline
    scores = np.linalg.norm(batch - ewma, axis=1)
    names = config.params.get("feature_names", [])
    rationales = [_top_features(x, ewma[i], names) for i, x in enumerate(batch)]
    return scores, rationales


def mad_score(batch: np.ndarray, config: DetectorConfig) -> tuple[np.ndarray, list[list[str]]]:
    median = np.asarray(
        config.params.get("median", np.zeros(batch.shape[1], dtype=float)),
        dtype=float,
    )
    mad = np.asarray(config.params.get("mad", np.ones(batch.shape[1], dtype=float)), dtype=float)
    scores = np.linalg.norm((batch - median) / (mad + 1e-6), axis=1)
    names = config.params.get("feature_names", [])
    rationales = [_top_features(x, median, names) for x in batch]
    return scores, rationales


def zscore_detector(batch: np.ndarray, config: DetectorConfig) -> tuple[np.ndarray, list[list[str]]]:
    mean = np.asarray(config.params.get("mean", np.mean(batch, axis=0)), dtype=float)
    std = np.asarray(config.params.get("std", np.std(batch, axis=0) + 1e-6), dtype=float)
    z = (batch - mean) / (std + 1e-6)
    scores = np.linalg.norm(z, axis=1)
    names = config.params.get("feature_names", [])
    rationales = [_top_features(z[i], np.zeros_like(z[i]), names) for i in range(len(batch))]
    return scores, rationales


def graph_rarity_score(
    paths: Iterable[list[str]], config: DetectorConfig
) -> tuple[np.ndarray, list[list[str]]]:
    rare_paths = set(tuple(p) for p in config.params.get("rare_paths", []))
    scores = []
    rationales: list[list[str]] = []
    for path in paths:
        rarity = 1.0 if tuple(path) in rare_paths else 0.0
        scores.append(rarity)
        rationales.append(path[:3])  # minimal path rationale
    return np.asarray(scores, dtype=float), rationales


DETECTOR_FUNCS = {
    "ewma": ewma_score,
    "mad": mad_score,
    "zscore": zscore_detector,
    "graph": graph_rarity_score,
}


def score_records(records: list[dict[str, Any]], config: DetectorConfig) -> DetectorResult:
    """Score the provided records for a given configuration."""

    if config.detector not in DETECTOR_FUNCS:
        raise ValueError(f"Unknown detector '{config.detector}'")

    matrix, feature_names = _feature_matrix(records, config.params.get("feature_names"))
    if config.detector == "graph":
        paths = [record.get("path", []) for record in records]
        scores, rationales = DETECTOR_FUNCS[config.detector](paths, config)
    else:
        config.params.setdefault("feature_names", feature_names)
        scores, rationales = DETECTOR_FUNCS[config.detector](matrix, config)
    return DetectorResult(
        scores=scores.tolist(),
        rationales=rationales,
        feature_matrix=matrix,
        feature_names=feature_names,
    )
