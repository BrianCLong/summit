import json
import os
import shutil
import sys
import tempfile
import unittest

# Add repo root to path to import verify_evidence
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(repo_root, "ci", "gates"))

import verify_evidence


class TestVerifyEvidence(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.evidence_dir = os.path.join(self.test_dir, "evidence")
        os.makedirs(self.evidence_dir)
        self.intel_schema_dir = os.path.join(self.test_dir, "intel", "schema")
        os.makedirs(self.intel_schema_dir)

        # Copy schemas from real repo to test dir
        shutil.copy(os.path.join(repo_root, "intel", "schema", "evidence_report.schema.json"), self.intel_schema_dir)
        shutil.copy(os.path.join(repo_root, "intel", "schema", "evidence_metrics.schema.json"), self.intel_schema_dir)
        shutil.copy(os.path.join(repo_root, "intel", "schema", "evidence_stamp.schema.json"), self.intel_schema_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_empty_index(self):
        with open(os.path.join(self.evidence_dir, "index.json"), "w") as f:
            json.dump({"items": {}}, f)

        errors = verify_evidence.verify_evidence(self.test_dir)
        self.assertEqual(errors, [])

    def test_valid_intel_item(self):
        # Create valid artifacts
        evd_dir = os.path.join(self.evidence_dir, "EVD-INTELBRIEF-TEST-001")
        os.makedirs(evd_dir)

        report = {
            "evidence_id": "EVD-INTELBRIEF-TEST-001",
            "summary": "Test Summary",
            "status": "pass",
            "steps": []
        }
        metrics = {
            "evidence_id": "EVD-INTELBRIEF-TEST-001",
            "metrics": {"count": 1}
        }
        stamp = {
            "evidence_id": "EVD-INTELBRIEF-TEST-001",
            "created_at": "2026-01-31T12:00:00Z",
            "git_commit": "abcdef",
            "run_id": "run-1"
        }

        with open(os.path.join(evd_dir, "report.json"), "w") as f:
            json.dump(report, f)
        with open(os.path.join(evd_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f)
        with open(os.path.join(evd_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f)

        index = {
            "items": {
                "EVD-INTELBRIEF-TEST-001": {
                    "files": [
                        "evidence/EVD-INTELBRIEF-TEST-001/report.json",
                        "evidence/EVD-INTELBRIEF-TEST-001/metrics.json",
                        "evidence/EVD-INTELBRIEF-TEST-001/stamp.json"
                    ]
                }
            }
        }
        with open(os.path.join(self.evidence_dir, "index.json"), "w") as f:
            json.dump(index, f)

        errors = verify_evidence.verify_evidence(self.test_dir)
        self.assertEqual(errors, [])

    def test_missing_files(self):
        index = {
            "items": {
                "EVD-INTELBRIEF-TEST-001": {
                    "files": ["evidence/EVD-INTELBRIEF-TEST-001/report.json"]
                }
            }
        }
        with open(os.path.join(self.evidence_dir, "index.json"), "w") as f:
            json.dump(index, f)

        errors = verify_evidence.verify_evidence(self.test_dir)
        self.assertTrue(any("Missing metrics.json" in e for e in errors))
        self.assertTrue(any("Missing stamp.json" in e for e in errors))

    def test_determinism_fail(self):
        evd_dir = os.path.join(self.evidence_dir, "EVD-INTELBRIEF-TEST-001")
        os.makedirs(evd_dir)

        # Report with timestamp
        report = {
            "evidence_id": "EVD-INTELBRIEF-TEST-001",
            "summary": "Test",
            "status": "pass",
            "created_at": "2026-01-01T00:00:00" # Forbidden
        }
        with open(os.path.join(evd_dir, "report.json"), "w") as f:
            json.dump(report, f)

        # Metrics with timestamp value
        metrics = {
            "evidence_id": "EVD-INTELBRIEF-TEST-001",
            "metrics": {"run_time": "2026-01-01T00:00:00"} # Forbidden
        }
        with open(os.path.join(evd_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f)

        # Valid stamp (needed to pass existence check)
        stamp = {
            "evidence_id": "EVD-INTELBRIEF-TEST-001",
            "created_at": "2026-01-31T12:00:00Z",
            "git_commit": "abcdef",
            "run_id": "run-1"
        }
        with open(os.path.join(evd_dir, "stamp.json"), "w") as f:
            json.dump(stamp, f)

        index = {
            "items": {
                "EVD-INTELBRIEF-TEST-001": {
                    "files": [
                        "evidence/EVD-INTELBRIEF-TEST-001/report.json",
                        "evidence/EVD-INTELBRIEF-TEST-001/metrics.json",
                        "evidence/EVD-INTELBRIEF-TEST-001/stamp.json"
                    ]
                }
            }
        }
        with open(os.path.join(self.evidence_dir, "index.json"), "w") as f:
            json.dump(index, f)

        errors = verify_evidence.verify_evidence(self.test_dir)
        self.assertTrue(any("Forbidden timestamp key" in e for e in errors))
        self.assertTrue(any("Forbidden timestamp value" in e for e in errors))

if __name__ == "__main__":
    unittest.main()
