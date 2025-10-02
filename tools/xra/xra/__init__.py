"""Explainable Ranking Auditor (XRA).

This package provides utilities to replay retrieval results, compute
fairness and coverage metrics, analyse rank shifts, and generate
model-agnostic explanations and audit reports.
"""

from .metrics import (
    compute_bias_metrics,
    coverage_at_k,
    exposure_disparity,
    fairness_at_k,
)
from .replay import load_retrieval_log
from .explanations import explain_rank_shift
from .report import generate_markdown_report

__all__ = [
    "compute_bias_metrics",
    "coverage_at_k",
    "exposure_disparity",
    "fairness_at_k",
    "load_retrieval_log",
    "explain_rank_shift",
    "generate_markdown_report",
]
