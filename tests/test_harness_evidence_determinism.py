import json
import re
from pathlib import Path

from summit_harness.evidence import EvidenceWriter


def test_harness_evidence_writer_deterministic(tmp_path):
    writer = EvidenceWriter(tmp_path)
    report = {"run_id": "test", "b": 2, "a": 1}
    metrics = {"run_id": "test", "counters": {"z": 10, "m": 5}}

    writer.write(report=report, metrics=metrics)

    # Check stable key ordering in report
    report_text = (tmp_path / "report.json").read_text()
    # "a" should come before "b" in alphabetical sort
    assert report_text.find('"a": 1') < report_text.find('"b": 2')

    # Check no timestamps in report/metrics
    assert not re.search(r'202\d-\d{2}-\d{2}', report_text)
    metrics_text = (tmp_path / "metrics.json").read_text()
    assert not re.search(r'202\d-\d{2}-\d{2}', metrics_text)

def test_harness_evidence_writer_stamp_allowed_timestamp(tmp_path):
    writer = EvidenceWriter(tmp_path)
    report = {"run_id": "test"}
    metrics = {"run_id": "test", "counters": {}}
    stamp = {"run_id": "test", "timestamp": "2025-01-24T12:00:00Z"}

    writer.write(report=report, metrics=metrics, stamp=stamp)

    stamp_text = (tmp_path / "stamp.json").read_text()
    assert re.search(r'202\d-\d{2}-\d{2}', stamp_text)
