"""Evidently-based drift monitoring utilities for the ML engine."""
from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from evidently import ColumnMapping
from evidently.metric_preset import ClassificationPreset, DataDriftPreset, RegressionPreset
from evidently.report import Report

from .metrics import record_drift_metrics

logger = logging.getLogger(__name__)


@dataclass
class DriftResult:
    """Structured result returned by an Evidently drift evaluation."""

    model_name: str
    data_drift_detected: bool
    share_of_drifted_columns: float
    number_of_drifted_columns: int
    performance_by_metric: Dict[str, Dict[str, float]]
    performance_drop: Dict[str, float]
    alerts: List[str]
    timestamp: float = field(default_factory=lambda: time.time())


class EvidentlyDriftMonitor:
    """Compute data drift and performance degradation metrics with Evidently."""

    def __init__(
        self,
        model_name: str,
        *,
        column_mapping: Optional[ColumnMapping] = None,
        target_column: Optional[str] = None,
        prediction_column: Optional[str] = None,
        numerical_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None,
        data_drift_threshold: float = 0.3,
        performance_drop_threshold: float = 0.1,
        monitored_metric: str = "f1",
        problem_type: str = "classification",
        metrics_to_log: Optional[List[str]] = None,
    ) -> None:
        self.model_name = model_name
        self.data_drift_threshold = data_drift_threshold
        self.performance_drop_threshold = performance_drop_threshold
        self.monitored_metric = monitored_metric
        self.problem_type = problem_type
        self.metrics_to_log = metrics_to_log

        self._explicit_mapping = column_mapping
        self._target_column = target_column
        self._prediction_column = prediction_column
        self._numerical_features = numerical_features or []
        self._categorical_features = categorical_features or []

        self._data_report = Report(metrics=[DataDriftPreset()])
        self._performance_report = self._build_performance_report(problem_type)

    def run(self, reference_data: pd.DataFrame, current_data: pd.DataFrame) -> DriftResult:
        """Run Evidently drift analysis and expose Prometheus metrics."""

        if reference_data.empty or current_data.empty:
            raise ValueError("Reference and current data frames must contain data")

        mapping = self._explicit_mapping or self._build_column_mapping()
        run_kwargs: Dict[str, Any] = {
            "reference_data": reference_data,
            "current_data": current_data,
        }
        if mapping is not None:
            run_kwargs["column_mapping"] = mapping

        self._data_report.run(**run_kwargs)
        drift_summary = self._extract_data_drift(self._data_report.as_dict())

        performance_by_metric: Dict[str, Dict[str, float]] = {}
        performance_drop: Dict[str, float] = {}
        if self._performance_report is not None:
            self._performance_report.run(**run_kwargs)
            performance_by_metric, performance_drop = self._extract_performance(
                self._performance_report.as_dict()
            )

        data_drift_detected = (
            drift_summary["share"] >= self.data_drift_threshold
            or drift_summary["dataset_drift"]
        )

        alerts: List[str] = []
        if data_drift_detected:
            alerts.append("data_drift")

        monitored_drop = performance_drop.get(self.monitored_metric)
        if monitored_drop is not None and monitored_drop >= self.performance_drop_threshold:
            alerts.append("performance_degradation")

        result = DriftResult(
            model_name=self.model_name,
            data_drift_detected=data_drift_detected,
            share_of_drifted_columns=drift_summary["share"],
            number_of_drifted_columns=drift_summary["count"],
            performance_by_metric=performance_by_metric,
            performance_drop=performance_drop,
            alerts=alerts,
        )

        record_drift_metrics(result, self.data_drift_threshold, self.performance_drop_threshold)
        logger.debug("Recorded Evidently drift metrics", extra={"result": result})
        return result

    def _build_performance_report(self, problem_type: str) -> Optional[Report]:
        if problem_type == "classification":
            return Report(metrics=[ClassificationPreset()])
        if problem_type == "regression":
            return Report(metrics=[RegressionPreset()])
        logger.info("No performance preset configured for problem_type=%s", problem_type)
        return None

    def _build_column_mapping(self) -> Optional[ColumnMapping]:
        if not any(
            [
                self._target_column,
                self._prediction_column,
                self._numerical_features,
                self._categorical_features,
            ]
        ):
            return None

        return ColumnMapping(
            target=self._target_column,
            prediction=self._prediction_column,
            numerical_features=self._numerical_features or None,
            categorical_features=self._categorical_features or None,
        )

    def _extract_data_drift(self, report_dict: Dict[str, Any]) -> Dict[str, Any]:
        metrics = report_dict.get("metrics", [])
        if not metrics:
            return {"share": 0.0, "count": 0, "dataset_drift": False}

        result = metrics[0].get("result", {})
        share = float(
            result.get("share_of_drifted_columns")
            or result.get("drift_share")
            or 0.0
        )
        count = int(result.get("number_of_drifted_columns") or 0)
        dataset_drift = bool(result.get("dataset_drift", False))
        return {"share": share, "count": count, "dataset_drift": dataset_drift}

    def _extract_performance(
        self, report_dict: Dict[str, Any]
    ) -> Tuple[Dict[str, Dict[str, float]], Dict[str, float]]:
        metrics = report_dict.get("metrics", [])
        if not metrics:
            return {}, {}

        result = metrics[0].get("result", {})
        current_metrics: Dict[str, Any] = result.get("current", {})
        reference_metrics: Dict[str, Any] = result.get("reference", {})

        metric_names = self.metrics_to_log or sorted(
            set(current_metrics.keys()) & set(reference_metrics.keys())
        )

        performance_values: Dict[str, Dict[str, float]] = {}
        drop_ratios: Dict[str, float] = {}

        for metric_name in metric_names:
            current_value = self._to_float(current_metrics.get(metric_name))
            reference_value = self._to_float(reference_metrics.get(metric_name))

            metric_entry: Dict[str, float] = {}
            if current_value is not None:
                metric_entry["current"] = current_value
            if reference_value is not None:
                metric_entry["reference"] = reference_value

            if metric_entry:
                performance_values[metric_name] = metric_entry

            drop_value = self._calculate_drop(reference_value, current_value)
            if drop_value is not None:
                drop_ratios[metric_name] = drop_value

        return performance_values, drop_ratios

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None
        if math.isnan(numeric) or math.isinf(numeric):
            return None
        return numeric

    @staticmethod
    def _calculate_drop(
        reference_value: Optional[float], current_value: Optional[float]
    ) -> Optional[float]:
        if reference_value is None or current_value is None:
            return None
        if reference_value == 0:
            if current_value < reference_value:
                return abs(current_value - reference_value)
            return 0.0
        return max(0.0, (reference_value - current_value) / abs(reference_value))
