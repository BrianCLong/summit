"""Data structures used by the pseudonym linkage risk auditor."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, Tuple
import json
from collections import OrderedDict


@dataclass(frozen=True)
class MitigationAction:
    """Represents a single mitigation action.

    Attributes:
        attribute: The quasi-identifier that the mitigation targets.
        strategy: The chosen strategy (e.g. "generalise" or "suppress").
        rationale: Human-readable justification of why the action is needed.
    """

    attribute: str
    strategy: str
    rationale: str


@dataclass
class MitigationPlan:
    """A deterministic mitigation plan with projected risk metrics."""

    actions: Tuple[MitigationAction, ...] = field(default_factory=tuple)
    projected_risk_score: float = 0.0
    details: Mapping[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return OrderedDict(
            actions=[action.__dict__ for action in self.actions],
            projected_risk_score=self.projected_risk_score,
            details=OrderedDict(sorted(self.details.items())),
        )


@dataclass
class RiskReport:
    """Structured output of the audit process."""

    seed: int
    k_map: Mapping[str, object]
    uniqueness_heatmap: Mapping[str, Mapping[str, float]]
    quasi_identifier_overlap: Mapping[str, float]
    linkage_simulation: Mapping[str, object]
    linkage_risk_score: float
    high_risk_records: Tuple[int, ...]
    mitigation_plan: MitigationPlan

    def to_dict(self) -> Dict[str, object]:
        """Serialise the report to a dictionary with deterministic ordering."""

        return OrderedDict(
            [
                ("seed", self.seed),
                ("k_map", _order_nested(self.k_map)),
                ("uniqueness_heatmap", _order_nested(self.uniqueness_heatmap)),
                ("quasi_identifier_overlap", OrderedDict(sorted(self.quasi_identifier_overlap.items()))),
                ("linkage_simulation", _order_nested(self.linkage_simulation)),
                ("linkage_risk_score", self.linkage_risk_score),
                ("high_risk_records", list(self.high_risk_records)),
                ("mitigation_plan", self.mitigation_plan.to_dict()),
            ]
        )

    def to_json(self) -> str:
        """Return a byte-identical JSON representation for deterministic seeds."""

        return json.dumps(self.to_dict(), sort_keys=False, separators=(",", ":"))


def _order_nested(value: object) -> object:
    """Helper to recursively order dictionaries for deterministic output."""

    if isinstance(value, Mapping):
        return OrderedDict((k, _order_nested(value[k])) for k in sorted(value))
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes, bytearray)):
        return [
            _order_nested(item)
            for item in value
        ]
    return value
