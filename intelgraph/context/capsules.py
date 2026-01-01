from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .types import ContextSegment, Invariant


@dataclass(slots=True)
class InvariantCapsule:
    capsule_id: str
    segments: List[ContextSegment]
    invariants: List[Invariant]

    def validate(self) -> bool:
        return all(
            invariant.validate(segment.content) for invariant in self.invariants for segment in self.segments
        )

    def with_invariant(self, invariant: Invariant) -> "InvariantCapsule":
        return InvariantCapsule(self.capsule_id, self.segments, [*self.invariants, invariant])
