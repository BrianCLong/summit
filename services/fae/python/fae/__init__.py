"""Federated Attribution Evaluator (FAE).

This package exposes utilities for computing privacy-aware uplift and
attribution metrics on securely aggregated datasets.
"""

from .aggregates import CupedAggregate, SecureAggregatedMetrics, SecureAggregator
from .uplift import compute_cuped_uplift
from .attribution import shapley_attribution, markov_attribution
from .dp import apply_dp_noise
from .cohort import slice_metrics
from .bias import run_bias_checks
from .report import generate_report, verify_report

__all__ = [
    "CupedAggregate",
    "SecureAggregatedMetrics",
    "SecureAggregator",
    "compute_cuped_uplift",
    "shapley_attribution",
    "markov_attribution",
    "apply_dp_noise",
    "slice_metrics",
    "run_bias_checks",
    "generate_report",
    "verify_report",
]
