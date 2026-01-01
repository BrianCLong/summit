from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .types import AssembledContext, ContextSegment


@dataclass(slots=True)
class TrustWeightedContextAssembler:
    default_max_segments: int = 50

    def assemble(
        self, segments: List[ContextSegment], *, max_segments: int | None = None, min_trust_weight: float = 0.0
    ) -> AssembledContext:
        max_segments = max_segments or self.default_max_segments
        filtered = sorted(
            [segment for segment in segments if segment.trust_weight.value >= min_trust_weight],
            key=lambda segment: segment.trust_weight.value,
            reverse=True,
        )[:max_segments]
        return AssembledContext(id=f"assembled-{id(self)}", segments=filtered, encoded=self.encode(filtered))

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
