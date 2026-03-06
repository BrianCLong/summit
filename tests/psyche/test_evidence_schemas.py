import os
import shutil
import tempfile

import jsonschema
import pytest

from summit.psyche.evidence.writer import EvidenceWriter


def test_evidence_writer_creates_valid_bundle():
    with tempfile.TemporaryDirectory() as tmpdir:
        writer = EvidenceWriter(tmpdir)

        # Report
        report_data = {
            "run_id": "test-run-1",
            "item_slug": "test-item",
            "evd_ids": ["EVD-PSYCHOMODEL-TEST-001"],
            "summary": {
                "what_ran": "Test Run",
                "result": "Success"
            },
            "artifacts": {
                "metrics": "metrics.json",
                "stamp": "stamp.json"
            }
        }
        writer.write_report(report_data)

        # Metrics
        metrics_data = {
            "policy_denials": 0,
            "signals_generated": 5,
            "latency_ms": 12.5
        }
        writer.write_metrics(metrics_data)

        # Stamp
        writer.write_stamp()

        # Index
        index_data = {
            "EVD-PSYCHOMODEL-TEST-001": ["path/to/evidence"]
        }
        writer.write_index(index_data)

        # Verify files exist
        assert os.path.exists(os.path.join(tmpdir, "report.json"))
        assert os.path.exists(os.path.join(tmpdir, "metrics.json"))
        assert os.path.exists(os.path.join(tmpdir, "stamp.json"))
        assert os.path.exists(os.path.join(tmpdir, "index.json"))

def test_schema_validation_fails_on_bad_data():
    with tempfile.TemporaryDirectory() as tmpdir:
        writer = EvidenceWriter(tmpdir)

        bad_report = {
            "run_id": 123, # Should be string
            "item_slug": "test"
            # Missing fields
        }
        with pytest.raises(jsonschema.ValidationError):
            writer.write_report(bad_report)

def test_index_schema_enforces_id_format():
    with tempfile.TemporaryDirectory() as tmpdir:
        writer = EvidenceWriter(tmpdir)

        bad_index = {
            "BAD-ID": ["path"]
        }
        with pytest.raises(jsonschema.ValidationError):
            writer.write_index(bad_index)
