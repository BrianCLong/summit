"""Fairness-Constrained Trainer (FCT) toolkit."""

from .lagrangian import FairnessConstraint, LagrangianFairClassifier
from .metrics import (
    demographic_parity_difference,
    fairness_report,
    true_positive_rate_gap,
)
from .pareto import ParetoFrontier
from .policy import FairnessEnvelope, PolicyGate, PolicyViolation
from .postprocessing import ThresholdAdjuster

__all__ = [
    "FairnessConstraint",
    "FairnessEnvelope",
    "LagrangianFairClassifier",
    "ParetoFrontier",
    "PolicyGate",
    "PolicyViolation",
    "ThresholdAdjuster",
    "demographic_parity_difference",
    "fairness_report",
    "true_positive_rate_gap",
]
