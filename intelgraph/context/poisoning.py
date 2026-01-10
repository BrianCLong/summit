from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .analysis import PoisoningIndicator
from .types import AssembledContext


@dataclass(slots=True)
class PoisoningResponse:
    suppressed_segment_ids: List[str]
    quarantined_segment_ids: List[str]
    warnings: List[str]


@dataclass(slots=True)
class PoisoningSuppressionResult(PoisoningResponse):
    retained_context: AssembledContext


class PoisoningResponder:
    def suppress(self, indicators: List[PoisoningIndicator]) -> PoisoningResponse:
        suspect_ids = [indicator.mutated_segment_id for indicator in indicators if indicator.mutated_segment_id]
        return PoisoningResponse(
            suppressed_segment_ids=suspect_ids,
            quarantined_segment_ids=[],
            warnings=[f"Suppressed {len(suspect_ids)} suspect segment(s)"] if suspect_ids else [],
        )

    def suppress_with_context(
        self, context: AssembledContext, indicators: List[PoisoningIndicator]
    ) -> PoisoningSuppressionResult:
        response = self.suppress(indicators)
        retained_segments = [
            segment for segment in context.segments if segment.metadata.id not in response.suppressed_segment_ids
        ]
        return PoisoningSuppressionResult(
            suppressed_segment_ids=response.suppressed_segment_ids,
            quarantined_segment_ids=response.quarantined_segment_ids,
            warnings=response.warnings,
            retained_context=AssembledContext(id=context.id, segments=retained_segments, encoded=context.encoded),
        )

    def quarantine(self, indicators: List[PoisoningIndicator]) -> PoisoningResponse:
        quarantined_ids = [indicator.mutated_segment_id for indicator in indicators if indicator.mutated_segment_id]
        return PoisoningResponse(
            suppressed_segment_ids=[],
            quarantined_segment_ids=quarantined_ids,
            warnings=[
                f"Quarantined segment {segment_id} due to divergence" for segment_id in quarantined_ids if segment_id
            ],
        )
