from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .analysis import PoisoningIndicator


@dataclass(slots=True)
class PoisoningResponse:
    suppressed_segment_ids: List[str]
    quarantined_segment_ids: List[str]
    warnings: List[str]


class PoisoningResponder:
    def suppress(self, indicators: List[PoisoningIndicator]) -> PoisoningResponse:
        suspect_ids = [indicator.mutated_segment_id for indicator in indicators if indicator.mutated_segment_id]
        return PoisoningResponse(
            suppressed_segment_ids=suspect_ids,
            quarantined_segment_ids=[],
            warnings=[f"Suppressed {len(suspect_ids)} suspect segment(s)"] if suspect_ids else [],
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
