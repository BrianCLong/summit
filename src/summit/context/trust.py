from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .types import AssembledContext, ContextSegment


@dataclass
class TrustWeightedContextAssembler:
    max_segments: int = 50

    def assemble(
        self, context_id: str, segments: List[ContextSegment]
    ) -> AssembledContext:
        sorted_segments = sorted(
            segments,
            key=lambda s: (-s.trust_weight.value, s.metadata.created_at, s.metadata.id),
        )
        selected = sorted_segments[: self.max_segments]
        encoded = [
            {
                "id": segment.metadata.id,
                "source": segment.metadata.source,
                "content": segment.content,
                "trust_weight": segment.trust_weight.value,
            }
            for segment in selected
        ]
        return AssembledContext(id=context_id, segments=selected, encoded=encoded)
