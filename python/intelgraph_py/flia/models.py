"""Data structures for the Feature Lineage Impact Analyzer (FLIA)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass(slots=True)
class LineageNode:
    """Represents a typed node in the lineage graph."""

    id: str
    type: str
    name: str
    owners: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_metadata_list(self, key: str) -> List[Dict[str, Any]]:
        """Return a list value from the metadata, defaulting to an empty list."""

        value = self.metadata.get(key, [])
        if isinstance(value, list):
            return value
        raise TypeError(
            f"Expected metadata '{key}' for {self.id} to be a list, got {type(value)!r}."
        )


@dataclass(slots=True)
class FliaReport:
    """Structured output summarising blast-radius analysis."""

    change_id: str
    impacted_nodes: List[Dict[str, Any]]
    impacted_models: List[Dict[str, Any]]
    metrics_at_risk: List[str]
    retrain_order: List[str]
    playbook: Dict[str, List[Dict[str, Any]]]

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable representation of the report."""

        return {
            "change_id": self.change_id,
            "impacted_nodes": self.impacted_nodes,
            "impacted_models": self.impacted_models,
            "metrics_at_risk": self.metrics_at_risk,
            "retrain_order": self.retrain_order,
            "playbook": self.playbook,
        }
