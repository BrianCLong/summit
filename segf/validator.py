"""Validator utilities for SEGF outputs."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from .config import TargetStats


@dataclass
class ValidationReport:
    """Structured report of validation metrics."""

    metrics: Dict[str, float]
    drift_metrics: Dict[str, Dict[str, float]]
    within_tolerance: bool
    messages: List[str]


class SegfValidator:
    """Validator that scores generated corpora against target statistics."""

    def __init__(self, target: TargetStats) -> None:
        self.target = target

    def evaluate(
        self,
        *,
        users: pd.DataFrame,
        events: pd.DataFrame,
        lifecycles: Optional[pd.DataFrame] = None,
    ) -> ValidationReport:
        """Compute deviation scores against configured targets."""

        metrics = self._compute_global_metrics(users, events, lifecycles)
        drift_metrics = self._compute_drift_metrics(events, metrics)

        within_tolerance = True
        messages: List[str] = []

        def _check(metric_key: str, actual: float, expected: float) -> None:
            nonlocal within_tolerance
            delta = abs(actual - expected)
            threshold = self.target.tolerance * expected if expected else self.target.tolerance
            if delta > threshold:
                within_tolerance = False
                messages.append(
                    f"{metric_key} deviates by {delta:.4f} (expected {expected:.4f}, actual {actual:.4f})."
                )

        _check("fraud_ratio", metrics["fraud_ratio"], self.target.expected_user_fraud_ratio)
        _check("chargeback_rate", metrics["chargeback_rate"], self.target.expected_chargeback_rate)
        _check("daily_transactions", metrics["daily_transactions"], self.target.expected_daily_transactions)

        for drift_name, scenario_metrics in drift_metrics.items():
            expectations = self.target.drift_windows.get(drift_name, {})
            if not expectations:
                continue
            for key, expected_value in expectations.items():
                actual_value = scenario_metrics.get(key)
                if actual_value is None:
                    continue
                _check(f"{drift_name}.{key}", actual_value, expected_value)

        return ValidationReport(metrics=metrics, drift_metrics=drift_metrics, within_tolerance=within_tolerance, messages=messages)

    def validate_reproducibility(self, config, runs: int = 2) -> bool:
        """Confirm deterministic outputs for fixed seeds."""

        if runs < 2:
            raise ValueError("runs must be >= 2 for reproducibility checks")

        from copy import deepcopy

        from .generator import SyntheticEntityGraphForge

        digests: List[str] = []
        for _ in range(runs):
            cfg = deepcopy(config)
            if cfg.random_seed is None:
                raise ValueError("SegfConfig.random_seed must be set for reproducibility validation")
            forge = SyntheticEntityGraphForge(cfg, seed=cfg.random_seed)
            result = forge.generate()
            digests.append(self._digest(result))
        return all(d == digests[0] for d in digests[1:])

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _compute_global_metrics(
        self,
        users: pd.DataFrame,
        events: pd.DataFrame,
        lifecycles: Optional[pd.DataFrame],
    ) -> Dict[str, float]:
        fraud_ratio = float(users.is_fraud.mean()) if not users.empty else 0.0
        transactions = events[events.event_type == "transaction"]
        chargebacks = events[events.event_type == "chargeback"]

        chargeback_rate = float(len(chargebacks) / len(transactions)) if len(transactions) else 0.0

        if lifecycles is not None and not lifecycles.empty:
            horizon_days = int(lifecycles.end_day.max() - lifecycles.start_day.min() + 1)
        else:
            if events.empty:
                horizon_days = 1
            else:
                span = (events.timestamp.max() - events.timestamp.min()).days
                horizon_days = max(span, 1)
        daily_transactions = float(len(transactions) / horizon_days) if horizon_days else 0.0

        return {
            "fraud_ratio": fraud_ratio,
            "chargeback_rate": chargeback_rate,
            "daily_transactions": daily_transactions,
            "transactions": float(len(transactions)),
            "chargebacks": float(len(chargebacks)),
            "horizon_days": float(horizon_days),
        }

    def _compute_drift_metrics(
        self,
        events: pd.DataFrame,
        global_metrics: Dict[str, float],
    ) -> Dict[str, Dict[str, float]]:
        txn_events = events[events.event_type == "transaction"]
        cb_events = events[events.event_type == "chargeback"]
        baseline_txn_rate = global_metrics.get("daily_transactions", 0.0)
        baseline_cb_rate = global_metrics.get("chargeback_rate", 0.0)

        metrics: Dict[str, Dict[str, float]] = {}
        if "drift_tag" not in events.columns:
            return metrics

        tags = events["drift_tag"].dropna().unique()
        for tag in tags:
            tag_txn_filter = txn_events["drift_tag"].fillna("").str.contains(tag)
            tag_cb_filter = cb_events["drift_tag"].fillna("").str.contains(tag)
            tag_txns = txn_events[tag_txn_filter]
            tag_cbs = cb_events[tag_cb_filter]
            txn_rate = float(len(tag_txns)) / global_metrics.get("horizon_days", 1.0)
            cb_rate = float(len(tag_cbs) / len(tag_txns)) if len(tag_txns) else 0.0
            metrics[tag] = {
                "txn_multiplier": (txn_rate / baseline_txn_rate) if baseline_txn_rate else np.nan,
                "chargeback_multiplier": (cb_rate / baseline_cb_rate) if baseline_cb_rate else np.nan,
                "txn_rate": txn_rate,
                "chargeback_rate": cb_rate,
            }
        return metrics

    def _digest(self, result) -> str:
        """Stable hash over key result tables for reproducibility checks."""

        import hashlib

        users_bytes = result.users.sort_values("user_id").to_csv(index=False).encode()
        events_bytes = result.events.sort_values("event_id").head(100).to_csv(index=False).encode()
        hasher = hashlib.sha256()
        hasher.update(users_bytes)
        hasher.update(events_bytes)
        return hasher.hexdigest()


__all__ = ["SegfValidator", "ValidationReport"]
