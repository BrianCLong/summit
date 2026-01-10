"""Federated Attribution Evaluator (FAE).

This package exposes utilities for computing privacy-aware uplift and
attribution metrics on securely aggregated datasets.
"""

from .aggregates import CupedAggregate, SecureAggregatedMetrics, SecureAggregator
from .attribution import markov_attribution, shapley_attribution
from .bias import run_bias_checks
from .cohort import slice_metrics
from .dp import apply_dp_noise
from .report import generate_report, verify_report
from .uplift import compute_cuped_uplift

__all__ = [
    "CupedAggregate",
    "SecureAggregatedMetrics",
    "SecureAggregator",
    "apply_dp_noise",
    "compute_cuped_uplift",
    "generate_report",
    "markov_attribution",
    "run_bias_checks",
    "shapley_attribution",
    "slice_metrics",
    "verify_report",
]
