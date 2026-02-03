import os
import pytest
from summit.io.evidence.validate import validate_file

# Reuse template files for testing
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "summit", "io", "evidence", "templates")

def test_validate_report_template():
    path = os.path.join(TEMPLATE_DIR, "report.json")
    assert validate_file(path, "report") == True

def test_validate_metrics_template():
    path = os.path.join(TEMPLATE_DIR, "metrics.json")
    assert validate_file(path, "metrics") == True

def test_validate_stamp_template():
    path = os.path.join(TEMPLATE_DIR, "stamp.json")
    assert validate_file(path, "stamp") == True

def test_validate_index_template():
    path = os.path.join(TEMPLATE_DIR, "index.json")
    assert validate_file(path, "index") == True


def test_reject_timestamp_outside_stamp(tmp_path):
    report_path = tmp_path / "report.json"
    report_path.write_text(
        """
        {
          "evidence_id": "EVD-TEMPLATE-002",
          "title": "Timestamp Leak",
          "summary": "Observed at 2026-01-03T10:00:00Z.",
          "sources": ["https://example.com"],
          "findings": ["Finding 1"]
        }
        """
    )
    assert validate_file(str(report_path), "report") == False
