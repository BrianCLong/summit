from pathlib import Path

import pytest

from simulated_ingestion.lineage_emitter import LineageEmitter


def test_emit_writes_jsonl(tmp_path: Path) -> None:
    sink = tmp_path / "lineage.log"
    emitter = LineageEmitter(sink_path=sink, operator="test-operator", dataset="test-dataset")

    event = emitter.emit(
        output_id="123",
        output_type="Person",
        input_ids=["source-1", "source-2"],
        transform_name="unit_test_transform",
    )

    assert sink.exists()
    contents = sink.read_text(encoding="utf-8").strip().splitlines()
    assert len(contents) == 1

    stored = contents[0]
    assert event["event_id"] in stored
    assert "unit_test_transform" in stored
    assert "source-1" in stored
    assert event["dataset"] == "test-dataset"


def test_validate_rejects_missing_output(tmp_path: Path) -> None:
    sink = tmp_path / "lineage.log"
    emitter = LineageEmitter(sink_path=sink, operator="test-operator", dataset="test-dataset")

    with pytest.raises(ValueError):
        emitter._validate_shape(  # type: ignore[attr-defined]
            {
                "event_id": "abc",
                "operator": "op",
                "occurred_at": "2025-01-01T00:00:00Z",
                "dataset": "ds",
                "inputs": [],
                "transform": {"name": "x"},
            }
        )
