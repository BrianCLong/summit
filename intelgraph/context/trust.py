from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from .types import AssembledContext, ContextSegment, ContextValidationResult, InvariantViolation


@dataclass(slots=True)
class TrustWeightedAssemblyReport:
    context: AssembledContext
    violations: Sequence[InvariantViolation]
    dropped_segment_ids: List[str]


@dataclass(slots=True)
class TrustWeightedContextAssembler:
    default_max_segments: int = 50

    def assemble(
        self,
        segments: List[ContextSegment],
        *,
        max_segments: int | None = None,
        min_trust_weight: float = 0.0,
        enforce_invariants: bool = False,
    ) -> AssembledContext:
        return self.assemble_with_report(
            segments,
            max_segments=max_segments,
            min_trust_weight=min_trust_weight,
            enforce_invariants=enforce_invariants,
        ).context

    def assemble_with_report(
        self,
        segments: List[ContextSegment],
        *,
        max_segments: int | None = None,
        min_trust_weight: float = 0.0,
        enforce_invariants: bool = False,
    ) -> TrustWeightedAssemblyReport:
        max_segments = max_segments or self.default_max_segments
        validation = self.validate_segments(segments)
        eligible = [segment for segment in segments if segment.trust_weight.value >= min_trust_weight]
        if enforce_invariants:
            invalid_ids = {violation.segment_id for violation in validation.violations}
            eligible = [segment for segment in eligible if segment.metadata.id not in invalid_ids]
        sorted_segments = sorted(
            eligible,
            key=lambda segment: (
                -segment.trust_weight.value,
                segment.metadata.created_at,
                segment.metadata.id,
            ),
        )[:max_segments]
        dropped_ids = [segment.metadata.id for segment in segments if segment not in sorted_segments]
        return TrustWeightedAssemblyReport(
            context=AssembledContext(
                id=self.build_context_id(sorted_segments),
                segments=sorted_segments,
                encoded=self.encode(sorted_segments),
            ),
            violations=validation.violations,
            dropped_segment_ids=dropped_ids,
        )

    def encode(self, segments: List[ContextSegment]) -> List[dict]:
        return [
            {
                "id": segment.metadata.id,
                "source": segment.metadata.source,
                "content": segment.content,
                "weight": segment.trust_weight.value,
                "labels": segment.metadata.labels,
            }
            for segment in segments
        ]

    def validate_segments(self, segments: List[ContextSegment]) -> ContextValidationResult:
        violations: List[InvariantViolation] = []
        for segment in segments:
            for invariant in segment.invariants:
                if not invariant.validate(segment.content):
                    violations.append(
                        InvariantViolation(
                            segment_id=segment.metadata.id,
                            invariant_id=invariant.id,
                            description=invariant.description,
                        )
                    )
        return ContextValidationResult(is_valid=not violations, violations=violations)

    @staticmethod
    def build_context_id(segments: List[ContextSegment]) -> str:
        signature = "|".join(f"{segment.metadata.id}:{segment.trust_weight.value}" for segment in segments)
        return f"assembled-{len(segments)}-{signature}"
