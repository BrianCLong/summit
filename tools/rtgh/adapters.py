"""Adapters for interacting with governance gates."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Protocol


@dataclass
class GateResult:
    allowed: bool
    severity: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_trace(self) -> Dict[str, Any]:
        trace = {"allowed": self.allowed, "severity": self.severity}
        if self.metadata:
            trace["metadata"] = self.metadata
        return trace


class GateAdapter(Protocol):
    """Protocol for pluggable gate adapters."""

    name: str

    def evaluate(self, payload: Any) -> GateResult:
        """Return the evaluation result for *payload*."""

    def trace_from(self, payload: Any, result: GateResult) -> Dict[str, Any]:
        return {"gate": self.name, "payload": payload, "result": result.to_trace()}


class InMemoryGateAdapter:
    """Utility adapter for tests and dry-runs."""

    def __init__(self, name: str, evaluator):
        self.name = name
        self._evaluator = evaluator
        self._trace: List[Dict[str, Any]] = []

    @property
    def trace(self) -> List[Dict[str, Any]]:
        return list(self._trace)

    def evaluate(self, payload: Any) -> GateResult:  # type: ignore[override]
        result = self._evaluator(payload)
        if not isinstance(result, GateResult):
            raise TypeError("Evaluator must return GateResult")
        self._trace.append({"payload": payload, **result.to_trace()})
        return result

    def trace_from(self, payload: Any, result: GateResult) -> Dict[str, Any]:  # type: ignore[override]
        return {"gate": self.name, "payload": payload, **result.to_trace()}


__all__ = ["GateAdapter", "GateResult", "InMemoryGateAdapter"]
