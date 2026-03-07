import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

# Add scripts to path so we can import verify_evidence
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scripts import verify_evidence


class TestEvidenceVerifier(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.evidence_dir = Path(self.test_dir) / "evidence"
        self.evidence_dir.mkdir()
        self.schema_dir = self.evidence_dir / "schema"
        self.schema_dir.mkdir()

        # Copy real schemas to temp dir
        real_schema_dir = Path(__file__).resolve().parents[1] / "evidence" / "schema"
        for schema_file in real_schema_dir.glob("*.schema.json"):
            shutil.copy(schema_file, self.schema_dir)

        # Patch verify_evidence.ROOT, EVD, and SCHEMA_DIR
        self.original_root = verify_evidence.ROOT
        self.original_evd = verify_evidence.EVD
        self.original_schema_dir = verify_evidence.SCHEMA_DIR
        verify_evidence.ROOT = Path(self.test_dir)
        verify_evidence.EVD = self.evidence_dir
        verify_evidence.SCHEMA_DIR = self.schema_dir

    def tearDown(self):
        verify_evidence.ROOT = self.original_root
        verify_evidence.EVD = self.original_evd
        verify_evidence.SCHEMA_DIR = self.original_schema_dir
        shutil.rmtree(self.test_dir)

    def create_required_files(self):
        index_content = {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-001",
                    "report": "evidence/report.json",
                    "metrics": "evidence/metrics.json",
                    "stamp": "evidence/stamp.json"
                }
            ]
        }
        (self.evidence_dir / "index.json").write_text(json.dumps(index_content))

        report_content = {
            "evidence_id": "EVD-TEST-001",
            "item_slug": "test-item",
            "claims": [],
            "assessments": []
        }
        (self.evidence_dir / "report.json").write_text(json.dumps(report_content))

        metrics_content = {
            "evidence_id": "EVD-TEST-001",
            "metrics": {"m1": 1.0}
        }
        (self.evidence_dir / "metrics.json").write_text(json.dumps(metrics_content))

        stamp_content = {
            "evidence_id": "EVD-TEST-001",
            "generated_at": "2025-10-31T23:59:59Z",
            "git_commit": "abc"
        }
        (self.evidence_dir / "stamp.json").write_text(json.dumps(stamp_content))

    def test_pass_minimal_compliant(self):
        self.create_required_files()
        self.assertEqual(verify_evidence.main(), 0)

    def test_fail_missing_files(self):
        # Only index exists
        (self.evidence_dir / "index.json").write_text(json.dumps({"version": "1.0", "items": []}))
        # items is empty, but if index is missing other files mentioned in it, it should fail.
        # Let's add an item but not the files.
        index_content = {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-001",
                    "report": "evidence/report.json",
                    "metrics": "evidence/metrics.json",
                    "stamp": "evidence/stamp.json"
                }
            ]
        }
        (self.evidence_dir / "index.json").write_text(json.dumps(index_content))
        self.assertNotEqual(verify_evidence.main(), 0)

    def test_fail_timestamp_outside_stamp(self):
        self.create_required_files()
        # Add a file with a timestamp
        (self.evidence_dir / "other.json").write_text(json.dumps({"date": "2025-10-31T10:00:00"}))
        self.assertNotEqual(verify_evidence.main(), 0)

if __name__ == "__main__":
    unittest.main()
