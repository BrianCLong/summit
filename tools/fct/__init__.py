"""Fairness-Constrained Trainer (FCT) toolkit."""

from .lagrangian import FairnessConstraint, LagrangianFairClassifier
from .postprocessing import ThresholdAdjuster
from .metrics import (
    demographic_parity_difference,
    true_positive_rate_gap,
    fairness_report,
)
from .pareto import ParetoFrontier
from .policy import FairnessEnvelope, PolicyGate, PolicyViolation

__all__ = [
    "FairnessConstraint",
    "LagrangianFairClassifier",
    "ThresholdAdjuster",
    "demographic_parity_difference",
    "true_positive_rate_gap",
    "fairness_report",
    "ParetoFrontier",
    "FairnessEnvelope",
    "PolicyGate",
    "PolicyViolation",
]
