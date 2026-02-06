import json

import pytest

from connectors.spiderfoot import OsintEvent, write_normalized


def test_determinism(tmp_path):
    events = [
        OsintEvent(type="A", value="1"),
        OsintEvent(type="B", value="2")
    ]

    p1 = tmp_path / "1.json"
    p2 = tmp_path / "2.json"

    write_normalized(events, str(p1))
    write_normalized(events, str(p2))

    assert p1.read_bytes() == p2.read_bytes()


from pathlib import Path

from summit_harness.evidence import EvidenceWriter


def test_harness_evidence_writer_determinism(tmp_path):
    writer = EvidenceWriter(tmp_path)
    report = {"evidence_id": "EVD-1", "summary": "test", "item_slug": "slug", "artifacts": ["a.txt"]}
    metrics = {"evidence_id": "EVD-1", "metrics": {"m1": 1.0}}

    # Run twice
    writer.write(report, metrics)
    p1 = tmp_path / "report.json"
    content1 = p1.read_text()

    writer.write(report, metrics)
    content2 = p1.read_text()

    assert content1 == content2
    # Check that keys are sorted in output
    data = json.loads(content1)
    keys = list(data.keys())
    assert keys == sorted(keys)
