import json
from pathlib import Path

import pytest

from modules.info_integrity.audit_export import create_aggregate_audit_export
from modules.info_integrity.reporting import write_compliance_evidence


def test_reporting(tmp_path):
    findings = {"prohibited_intent_blocks": 5, "prohibited_field_blocks": 2}
    evidence_id = "TEST-EVD-001"

    files = write_compliance_evidence(tmp_path, evidence_id, findings)

    report = json.loads(Path(files["report"]).read_text())
    assert report["evidence_id"] == evidence_id
    assert report["findings"]["prohibited_intent_blocks"] == 5

    metrics = json.loads(Path(files["metrics"]).read_text())
    assert metrics["prohibited_intent_blocks"] == 5

    stamp = json.loads(Path(files["stamp"]).read_text())
    assert "generated_at" in stamp
    assert "Z" in stamp["generated_at"]

def test_audit_export(tmp_path):
    records = [
        {"region_bucket": "US", "topic": "news", "volume_estimate": 100, "psychographic_segment": "A"},
        {"region_bucket": "EU", "topic": "weather", "volume_estimate": 200, "individual_id": "user1"}
    ]

    audit_file = create_aggregate_audit_export(tmp_path, records)

    with open(audit_file) as f:
        lines = f.readlines()
        assert len(lines) == 2

        record1 = json.loads(lines[0])
        assert "region_bucket" in record1
        assert "psychographic_segment" not in record1

        record2 = json.loads(lines[1])
        assert "individual_id" not in record2
