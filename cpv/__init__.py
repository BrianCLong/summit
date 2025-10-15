"""Categorical Privacy Validator (CPV).

This package evaluates categorical privacy guarantees on tabular data. It
currently supports the following privacy models:

* :term:`k-map` anonymity (also known as :math:`(k, P)`-anonymity)
* :term:`\\ell`-diversity
* :term:`t`-closeness (with multiple distance metrics)

The public API exposes helpers to build reproducible privacy assessment
reports, render violation heatmaps, and design remediation plans that rely on
value generalisation or record suppression.
"""

from .evaluator import evaluate_privacy, build_population_map
from .heatmap import generate_violation_heatmap
from .remediation import plan_remediations
from .report import (
    KMappViolation,
    LDiversityViolation,
    PrivacyEvaluationReport,
    TClosenessViolation,
)

__all__ = [
    "evaluate_privacy",
    "build_population_map",
    "generate_violation_heatmap",
    "plan_remediations",
    "KMappViolation",
    "LDiversityViolation",
    "TClosenessViolation",
    "PrivacyEvaluationReport",
]
