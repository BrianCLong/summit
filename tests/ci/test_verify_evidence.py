import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class TestVerifyEvidence(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())
        self.evidence_dir = self.test_dir / "evidence"
        self.evidence_dir.mkdir()
        self.schemas_dir = self.evidence_dir / "schemas"
        self.schemas_dir.mkdir()

        # Copy schemas from real repo to test dir
        # We assume we are running from repo root
        real_schemas = Path("evidence/schemas")
        if not real_schemas.exists():
             # Fallback if running from somewhere else?
             real_schemas = Path("../../evidence/schemas")

        for schema in real_schemas.glob("*.json"):
            shutil.copy(schema, self.schemas_dir / schema.name)

        # Script path
        self.script_path = Path("scripts/ci/verify_evidence.py").resolve()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def run_verify(self):
        env = os.environ.copy()
        env["SUMMIT_EVIDENCE_ROOT"] = str(self.evidence_dir)
        result = subprocess.run(
            [sys.executable, str(self.script_path)],
            env=env,
            capture_output=True,
            text=True
        )
        return result

    def write_json(self, path, content):
        with open(path, "w") as f:
            json.dump(content, f)

    def test_valid_evidence(self):
        # Create valid artifacts
        self.write_json(self.evidence_dir / "index.json", {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-WORKFLOW-001",
                    "files": ["evidence/report.json", "evidence/metrics.json", "evidence/stamp.json"]
                }
            ]
        })

        self.write_json(self.evidence_dir / "report.json", {
            "evidence_id": "EVD-TEST-WORKFLOW-001",
            "summary": "Test Summary",
            "steps": [{"name": "step1", "status": "pass"}],
            "run_id": "run-1",
            "item_slug": "slug",
            "evd_ids": ["EVD-TEST-WORKFLOW-001"],
            "artifacts": {}
        })

        self.write_json(self.evidence_dir / "metrics.json", {
            "evidence_id": "EVD-TEST-WORKFLOW-001",
            "metrics": {"duration": 100}
        })

        self.write_json(self.evidence_dir / "stamp.json", {
            "evidence_id": "EVD-TEST-WORKFLOW-001",
            "generated_at": "2023-10-27T10:00:00Z",
            "ci_run_id": "run-1"
        })

        result = self.run_verify()
        if result.returncode != 0:
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
        self.assertEqual(result.returncode, 0)
        self.assertIn("evidence-verify: PASS", result.stdout)

    def test_missing_file(self):
        self.write_json(self.evidence_dir / "index.json", {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-WORKFLOW-001",
                    "files": ["evidence/report.json"]
                }
            ]
        })
        # report.json missing

        result = self.run_verify()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("File referenced in index not found", result.stderr)

    def test_invalid_schema(self):
        self.write_json(self.evidence_dir / "index.json", {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-WORKFLOW-001",
                    "files": ["evidence/report.json"]
                }
            ]
        })

        # Invalid report (missing summary)
        self.write_json(self.evidence_dir / "report.json", {
            "evidence_id": "EVD-TEST-WORKFLOW-001",
            "steps": []
        })

        result = self.run_verify()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing required field 'summary'", result.stderr)

    def test_timestamp_leakage(self):
        self.write_json(self.evidence_dir / "index.json", {
            "version": "1.0",
            "items": []
        })

        # Report with timestamp
        self.write_json(self.evidence_dir / "leaky_report.json", {
            "date": "2023-10-27"
        })

        result = self.run_verify()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Possible timestamps found", result.stderr)

if __name__ == "__main__":
    unittest.main()
