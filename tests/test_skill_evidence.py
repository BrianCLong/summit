import pytest
import json
from pathlib import Path
from summit.evidence.writer import EvidenceWriter

def test_evidence_generation(tmp_path):
    evidence_dir = tmp_path / "evidence"
    writer = EvidenceWriter(evidence_dir)

    report = {"evd_id": "TEST-001", "summary": "Test summary", "artifacts": []}
    metrics = {"duration": 1.5, "files_read": 3}

    writer.write_evidence("TEST-001", report, metrics)

    # Check files
    evd_path = evidence_dir / "TEST-001"
    assert (evd_path / "report.json").exists()
    assert (evd_path / "metrics.json").exists()
    assert (evd_path / "stamp.json").exists()

    # Check index
    index_path = evidence_dir / "index.json"
    assert index_path.exists()

    index = json.loads(index_path.read_text())
    assert len(index["evidence"]) == 1
    assert index["evidence"][0]["id"] == "TEST-001"

    # Verify content
    stamp = json.loads((evd_path / "stamp.json").read_text())
    assert "created_at" in stamp
