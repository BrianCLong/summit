import json

from summit.evals.coordination.coordination_schema import CoordinationEvent, validate_event_stream
from summit.evals.coordination.coordination_score import score_coordination, write_coordination_artifacts


def _events():
    return [
        CoordinationEvent(
            evidence_id="EVD-COORD-001",
            from_agent="schema",
            to_agent="metrics",
            context_hash="abc",
            timestamp=1,
            handoff_complete=True,
            conflict_resolved_ms=100,
        ),
        CoordinationEvent(
            evidence_id="EVD-COORD-001",
            from_agent="metrics",
            to_agent="ci",
            context_hash="abc",
            timestamp=2,
            handoff_complete=True,
            conflict_resolved_ms=200,
        ),
    ]


def test_score_coordination_above_threshold_for_clean_handoffs():
    result = score_coordination(_events())
    assert result.coordination_score >= 0.85
    assert result.handoff_completeness_ratio == 1.0


def test_validate_event_stream_rejects_non_monotonic_time():
    events = _events()
    events[1] = CoordinationEvent(
        evidence_id=events[1].evidence_id,
        from_agent=events[1].from_agent,
        to_agent=events[1].to_agent,
        context_hash=events[1].context_hash,
        timestamp=0,
    )

    try:
        validate_event_stream(events)
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "monotonic" in str(exc)


def test_write_coordination_artifacts_is_deterministic(tmp_path):
    output_dir = tmp_path / "artifacts"
    events = _events()
    write_coordination_artifacts(events, output_dir=output_dir)
    first = json.loads((output_dir / "coordination_metrics.json").read_text(encoding="utf-8"))

    write_coordination_artifacts(events, output_dir=output_dir)
    second = json.loads((output_dir / "coordination_metrics.json").read_text(encoding="utf-8"))

    assert first == second
