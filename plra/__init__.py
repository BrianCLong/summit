"""Pseudonym Linkage Risk Auditor (PLRA).

This module exposes the public API for the plra package, which focuses on
estimating linkage risks across pseudonymised or tokenised datasets.
"""

from .auditor import PseudonymLinkageRiskAuditor
from .fixtures import load_seeded_fixture
from .report import MitigationAction, MitigationPlan, RiskReport

__all__ = [
    "MitigationAction",
    "MitigationPlan",
    "PseudonymLinkageRiskAuditor",
    "RiskReport",
    "load_seeded_fixture",
]
