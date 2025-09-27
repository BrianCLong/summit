"""Reporting primitives for the Causal Feature Store Validator."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class CFSVIssue:
    """Represents a single leakage or contamination finding."""

    type: str
    feature: Optional[str]
    severity: str
    description: str
    suggestions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the issue for downstream reporting."""

        return {
            "type": self.type,
            "feature": self.feature,
            "severity": self.severity,
            "description": self.description,
            "suggestions": list(self.suggestions),
        }


@dataclass(frozen=True)
class CFSVReport:
    """Summary of the validator findings."""

    leakage_score: float
    issues: List[CFSVIssue]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the report to a JSON-friendly structure."""

        return {
            "leakage_score": self.leakage_score,
            "issues": [issue.to_dict() for issue in self.issues],
            "metadata": dict(self.metadata),
        }
