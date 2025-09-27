"""Drift Root-Cause Explorer (DRCE).

This module exposes the primary interfaces for running drift attribution and
counterfactual analysis across data pipelines.
"""

from .analyzer import DriftRootCauseExplorer
from .scenario import DriftScenario
from .synthetic import build_synthetic_scenario

__all__ = [
    "DriftRootCauseExplorer",
    "DriftScenario",
    "build_synthetic_scenario",
]
