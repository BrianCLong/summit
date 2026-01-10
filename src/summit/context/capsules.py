from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .types import ContextSegment, Invariant


@dataclass
class CapsuleResult:
    segment_id: str
    invariant_id: str
    valid: bool
    message: str | None = None


@dataclass
class InvariantCapsule:
    segments: List[ContextSegment]

    def validate(self) -> List[CapsuleResult]:
        results: List[CapsuleResult] = []
        for segment in self.segments:
            for invariant in segment.invariants:
                valid = invariant.validate(segment.content)
                results.append(
                    CapsuleResult(
                        segment_id=segment.metadata.id,
                        invariant_id=invariant.id,
                        valid=valid,
                        message=(
                            None
                            if valid
                            else f"Invariant {invariant.id} failed for {segment.metadata.id}"
                        ),
                    )
                )
        return results

    def isolate_invariant_failures(self) -> List[ContextSegment]:
        return [
            segment
            for segment in self.segments
            if any(
                not invariant.validate(segment.content)
                for invariant in segment.invariants
            )
        ]
