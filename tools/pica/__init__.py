"""Policy Impact Causal Analyzer (PICA).

This module provides a lightweight interface for estimating the causal impact
of policy rollouts (allow, deny, redact) using three complementary estimators:
Difference-in-Differences, Synthetic Controls, and CUPED. The toolkit accepts
rollout manifests and KPI observations and produces deterministic signed briefs
summarising the inferred effects along with sensitivity analyses.
"""
from .analyzer import PICAAnalyzer
from .data import (
    ImpactBrief,
    ImpactEstimate,
    KPIObservation,
    ManifestSource,
    PICAOptions,
    PolicyAction,
    RolloutManifest,
    RolloutPhase,
)

__all__ = [
    "PICAAnalyzer",
    "ImpactBrief",
    "ImpactEstimate",
    "KPIObservation",
    "ManifestSource",
    "PICAOptions",
    "PolicyAction",
    "RolloutManifest",
    "RolloutPhase",
]
