from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List

from .analysis import PoisoningIndicator
from .types import AssembledContext, ContextSegment


@dataclass
class PoisoningResponse:
    suppressed_segment_ids: List[str]
    quarantined_segment_ids: List[str]
    rationale: dict[str, str]


class PoisoningResponder:
    def __init__(
        self, quarantine: Callable[[ContextSegment], None] | None = None
    ) -> None:
        self.quarantine = quarantine or (lambda _segment: None)

    def apply(
        self, context: AssembledContext, indicators: List[PoisoningIndicator]
    ) -> PoisoningResponse:
        suppressed_segment_ids: set[str] = set()
        quarantined_segment_ids: set[str] = set()
        rationale: dict[str, str] = {}

        for indicator in indicators:
            suppressed_segment_ids.add(indicator.segment_id)
            rationale[indicator.segment_id] = (
                f"Divergence {indicator.divergence:.2f} detected via "
                f"{indicator.modification}"
            )

        for indicator in indicators:
            for segment in context.segments:
                if segment.metadata.id == indicator.segment_id:
                    quarantined_segment_ids.add(segment.metadata.id)
                    self.quarantine(segment)

        return PoisoningResponse(
            suppressed_segment_ids=list(suppressed_segment_ids),
            quarantined_segment_ids=list(quarantined_segment_ids),
            rationale=rationale,
        )
