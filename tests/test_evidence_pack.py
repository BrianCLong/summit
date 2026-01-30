import json
import os
import shutil
import pytest
from pathlib import Path
from tools.evidence_pack import build_min_evidence_pack, EvidenceRef

@pytest.fixture
def temp_evidence_dir(tmp_path):
    d = tmp_path / "evidence_test"
    d.mkdir()
    return d

def test_evidence_pack_generation(temp_evidence_dir):
    refs = [
        EvidenceRef(
            evidence_id="EVD-TEST-001",
            files=["report.json"],
            area="test",
            description="Test evidence"
        )
    ]

    build_min_evidence_pack(temp_evidence_dir, refs)

    assert (temp_evidence_dir / "report.json").exists()
    assert (temp_evidence_dir / "metrics.json").exists()
    assert (temp_evidence_dir / "stamp.json").exists()
    assert (temp_evidence_dir / "index.json").exists()

    # Verify content structure
    report = json.loads((temp_evidence_dir / "report.json").read_text())
    assert report["version"] == 1
    assert "summary" in report
    assert "sections" in report

    index = json.loads((temp_evidence_dir / "index.json").read_text())
    assert index["version"] == 1
    assert len(index["evidence"]) == 1
    assert index["evidence"][0]["evidence_id"] == "EVD-TEST-001"

def test_evidence_pack_determinism(temp_evidence_dir):
    refs = [
        EvidenceRef(
            evidence_id="EVD-TEST-001",
            files=["report.json"],
            area="test",
            description="Test evidence"
        )
    ]

    dir1 = temp_evidence_dir / "run1"
    dir2 = temp_evidence_dir / "run2"
    dir1.mkdir()
    dir2.mkdir()

    build_min_evidence_pack(dir1, refs)
    build_min_evidence_pack(dir2, refs)

    # report.json should be identical
    assert (dir1 / "report.json").read_text() == (dir2 / "report.json").read_text()

    # metrics.json should be identical
    assert (dir1 / "metrics.json").read_text() == (dir2 / "metrics.json").read_text()

    # index.json should be identical
    assert (dir1 / "index.json").read_text() == (dir2 / "index.json").read_text()

    # stamp.json should differ (timestamps) or be valid
    stamp1 = json.loads((dir1 / "stamp.json").read_text())
    assert stamp1["version"] == 1

def test_evidence_pack_validation(temp_evidence_dir):
    # Use the verify_evidence logic or schema validation here
    from jsonschema import validate

    refs = [
        EvidenceRef(
            evidence_id="EVD-TEST-001",
            files=["report.json"],
            area="test",
            description="Test evidence"
        )
    ]
    build_min_evidence_pack(temp_evidence_dir, refs)

    schemas_dir = Path("evidence/schemas") # Using the ones we created

    # Ensure schemas exist before testing
    if not schemas_dir.exists():
        pytest.skip("Schemas not found in evidence/schemas")

    report = json.loads((temp_evidence_dir / "report.json").read_text())
    report_schema = json.loads((schemas_dir / "report.schema.json").read_text())
    validate(instance=report, schema=report_schema)

    metrics = json.loads((temp_evidence_dir / "metrics.json").read_text())
    metrics_schema = json.loads((schemas_dir / "metrics.schema.json").read_text())
    validate(instance=metrics, schema=metrics_schema)

    stamp = json.loads((temp_evidence_dir / "stamp.json").read_text())
    stamp_schema = json.loads((schemas_dir / "stamp.schema.json").read_text())
    validate(instance=stamp, schema=stamp_schema)

    index = json.loads((temp_evidence_dir / "index.json").read_text())
    index_schema = json.loads((schemas_dir / "index.schema.json").read_text())
    validate(instance=index, schema=index_schema)
