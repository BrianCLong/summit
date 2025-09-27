"""Causal Feature Store Validator (CFSV).

This package provides utilities to analyse feature sets for leakage, post-treatment
contamination and causal issues before model training.
"""

from .report import CFSVIssue, CFSVReport
from .validator import CFSValidator

__all__ = ["CFSValidator", "CFSVIssue", "CFSVReport"]
