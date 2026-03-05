from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from ..nog.model import NarrativeOperatingGraph
from ..nog.snapshot import canonical_hash
from .transition import apply_intervention


@dataclass(frozen=True)
class SimResult:
    input_snapshot: str
    hypothetical_snapshot: str
    metrics: dict[str, Any]


def simulate(nog: NarrativeOperatingGraph, intervention: dict[str, Any]) -> SimResult:
    base_hash = canonical_hash(nog)
    hypothetical = apply_intervention(nog, intervention)
    hypothetical_hash = canonical_hash(hypothetical)
    metrics = {
        "reach": 0,
        "sentiment_delta": 0.0,
        "adversarial_response_prob": 0.0,
        "policy_risk": 0.0,
        "financial_risk": 0.0,
    }
    return SimResult(base_hash, hypothetical_hash, metrics)
