"""Model Forgetting & Unlearning Evaluator (MFUE).

This package provides utilities to benchmark machine unlearning methods.
"""

from .baselines import (
    BaseUnlearningBaseline,
    FineTuneUnlearningBaseline,
    MaskBasedUnlearningBaseline,
)
from .config import ReproducibilityConfig
from .datasets import DatasetSplit
from .evaluator import MFUEvaluator
from .metrics import EvaluationResult
from .models import LogisticRegressionModel
from .report import EvaluationReport

__all__ = [
    "BaseUnlearningBaseline",
    "DatasetSplit",
    "EvaluationReport",
    "EvaluationResult",
    "FineTuneUnlearningBaseline",
    "LogisticRegressionModel",
    "MFUEvaluator",
    "MaskBasedUnlearningBaseline",
    "ReproducibilityConfig",
]
