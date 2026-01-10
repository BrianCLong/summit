from datetime import datetime

from intelgraph.context.trust import TrustWeightedContextAssembler
from intelgraph.context.types import ContextSegment, ContextSegmentMetadata, TrustWeight


def _segment(segment_id: str, weight: float, valid: bool) -> ContextSegment:
    class _Invariant:
        id = "inv"
        description = "test"

        def validate(self, _: object) -> bool:
            return valid

    return ContextSegment(
        metadata=ContextSegmentMetadata(id=segment_id, source="unit", created_at=datetime.utcnow(), labels=[]),
        content=f"segment-{segment_id}",
        trust_weight=TrustWeight(value=weight),
        invariants=[_Invariant()],
    )


def test_assemble_with_report_enforces_invariants_and_trust():
    assembler = TrustWeightedContextAssembler(default_max_segments=5)
    segments = [_segment("a", 0.9, True), _segment("b", 0.1, False)]

    report = assembler.assemble_with_report(segments, min_trust_weight=0.2, enforce_invariants=True)

    assert [segment.metadata.id for segment in report.context.segments] == ["a"]
    assert report.violations
    assert "b" in report.dropped_segment_ids
