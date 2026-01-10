from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, List, Protocol, Sequence


ContextSegmentId = str


class Invariant(Protocol):
    id: str
    description: str

    def validate(self, payload: Any) -> bool:
        ...


@dataclass(slots=True)
class TrustWeight:
    value: float
    rationale: str | None = None


@dataclass(slots=True)
class ContextSegmentMetadata:
    id: ContextSegmentId
    source: str
    created_at: datetime
    labels: List[str] = field(default_factory=list)


@dataclass(slots=True)
class ContextSegment:
    metadata: ContextSegmentMetadata
    content: Any
    trust_weight: TrustWeight
    invariants: List[Invariant] = field(default_factory=list)


@dataclass(slots=True)
class InvariantViolation:
    segment_id: ContextSegmentId
    invariant_id: str
    description: str


@dataclass(slots=True)
class ContextValidationResult:
    is_valid: bool
    violations: Sequence[InvariantViolation]


@dataclass(slots=True)
class AssembledContext:
    id: str
    segments: List[ContextSegment]
    encoded: Any


@dataclass(slots=True)
class ModelExecutionRequest:
    context: AssembledContext
    model_id: str
    input: Any


@dataclass(slots=True)
class ModelExecutionResponse:
    request_id: str
    model_id: str
    output: Any
    raw_trace: Any | None = None


# Helper factory for simple invariants

def predicate_invariant(invariant_id: str, description: str, predicate: Callable[[Any], bool]) -> Invariant:
    class _PredicateInvariant:
        id = invariant_id
        description = description

        def validate(self, payload: Any) -> bool:  # type: ignore[override]
            return predicate(payload)

    return _PredicateInvariant()
