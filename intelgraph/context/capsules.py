from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .types import ContextSegment, ContextValidationResult, Invariant, InvariantViolation


@dataclass(slots=True)
class InvariantCapsule:
    capsule_id: str
    segments: List[ContextSegment]
    invariants: List[Invariant]

    def validate(self) -> bool:
        return self.validate_with_report().is_valid

    def validate_with_report(self) -> ContextValidationResult:
        violations: List[InvariantViolation] = []
        for segment in self.segments:
            for invariant in self.invariants:
                if not invariant.validate(segment.content):
                    violations.append(
                        InvariantViolation(
                            segment_id=segment.metadata.id,
                            invariant_id=invariant.id,
                            description=invariant.description,
                        )
                    )
        return ContextValidationResult(is_valid=not violations, violations=violations)

    def with_invariant(self, invariant: Invariant) -> "InvariantCapsule":
        return InvariantCapsule(self.capsule_id, self.segments, [*self.invariants, invariant])
