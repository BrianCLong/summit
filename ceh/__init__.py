"""Counterfactual Evaluation Harness (CEH).

This package exposes utilities to build counterfactual
stress tests for predictive models, including
feature ablations, causal backdoor adjustment,
uplift analysis, and IRM-style reweighting penalties.
"""

from .datasets import CEHDataset, load_breast_cancer_demo, load_synthetic_demo
from .evaluation import CounterfactualEvaluationHarness

__all__ = [
    "CEHDataset",
    "CounterfactualEvaluationHarness",
    "load_breast_cancer_demo",
    "load_synthetic_demo",
]
