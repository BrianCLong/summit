"""Model Forgetting & Unlearning Evaluator (MFUE).

This package provides utilities to benchmark machine unlearning methods.
"""

from .config import ReproducibilityConfig
from .datasets import DatasetSplit
from .evaluator import MFUEvaluator
from .metrics import EvaluationResult
from .report import EvaluationReport
from .baselines import (
    BaseUnlearningBaseline,
    FineTuneUnlearningBaseline,
    MaskBasedUnlearningBaseline,
)
from .models import LogisticRegressionModel

__all__ = [
    "ReproducibilityConfig",
    "DatasetSplit",
    "MFUEvaluator",
    "EvaluationResult",
    "EvaluationReport",
    "BaseUnlearningBaseline",
    "FineTuneUnlearningBaseline",
    "MaskBasedUnlearningBaseline",
    "LogisticRegressionModel",
]
