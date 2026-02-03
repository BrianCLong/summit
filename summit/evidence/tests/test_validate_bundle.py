import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

# We test the script tools/ci/evidence_validate_bundle.py by invoking it as a subprocess

TOOLS_CI_DIR = Path(__file__).resolve().parents[3] / "tools/ci"
SCRIPT_PATH = TOOLS_CI_DIR / "evidence_validate_bundle.py"
FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"

class TestEvidenceValidateBundle(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.bundle_dir = Path(self.test_dir) / "bundle"
        self.bundle_dir.mkdir()
        (self.bundle_dir / "evidence").mkdir()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def write_json(self, path, data):
        with open(path, 'w') as f:
            json.dump(data, f, sort_keys=True, indent=2)

    def test_valid_bundle(self):
        # Create a valid minimal bundle
        index = {
            "bundle_id": "test-bundle-001",
            "evidence": [
                {
                    "description": "Report",
                    "evidence_id": "EVD-PP-SOCIALREASONING-EVAL-001",
                    "path": "evidence/report.json",
                    "schema_path": "evidence.report.schema.json"
                },
                {
                    "description": "Stamp",
                    "evidence_id": "EVD-PP-SOCIALREASONING-SCHEMA-001",
                    "path": "evidence/stamp.json",
                    "schema_path": "evidence.stamp.schema.json"
                }
            ],
            "item": {
                "arxiv_id": "2601.20757"
            }
        }

        report = {
            "evidence_id": "EVD-PP-SOCIALREASONING-EVAL-001",
            "item": { "arxiv_id": "2601.20757" },
            "summary": { "accuracy": 0.9 }
        }

        stamp = {
            "created_at": "2026-01-28T00:00:00Z",
            "evidence_id": "EVD-PP-SOCIALREASONING-SCHEMA-001",
            "item": { "arxiv_id": "2601.20757" }
        }

        self.write_json(self.bundle_dir / "evidence/index.json", index)
        self.write_json(self.bundle_dir / "evidence/report.json", report)
        self.write_json(self.bundle_dir / "evidence/stamp.json", stamp)

        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(self.bundle_dir)],
            capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, f"Script failed: {result.stderr}")
        self.assertIn("PASS: Bundle is valid.", result.stdout)

    def test_fixture_bundle_passes(self):
        fixture_dir = FIXTURES_DIR / "pass_bundle"
        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(fixture_dir)],
            capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, f"Fixture failed: {result.stderr}")
        self.assertIn("PASS: Bundle is valid.", result.stdout)

    def test_fixture_bundle_fails(self):
        fixture_dir = FIXTURES_DIR / "fail_bundle"
        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(fixture_dir)],
            capture_output=True, text=True
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Timestamp key 'created_at' found", result.stderr)

    def test_invalid_keys_order(self):
        # Write file with unsorted keys manually
        index_path = self.bundle_dir / "evidence/index.json"
        with open(index_path, 'w') as f:
            # 'item' comes before 'bundle_id' -> unsorted (i > b)
            f.write('{"item": {"arxiv_id": "2601.20757"}, "bundle_id": "test"}')

        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(self.bundle_dir)],
            capture_output=True, text=True
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Keys not sorted", result.stderr)

    def test_timestamp_outside_stamp(self):
        index = {
             "bundle_id": "test",
             "created_at": "2026-01-01",
             "evidence": [],
             "item": {"arxiv_id": "2601.20757"}
        }
        self.write_json(self.bundle_dir / "evidence/index.json", index)

        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(self.bundle_dir)],
            capture_output=True, text=True
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Timestamp key 'created_at' found", result.stderr)

    def test_allowed_substrings(self):
        # Keys like 'candidate' (contains date) or 'validation' (contains at) should be allowed
        index = {
             "bundle_id": "test",
             "candidate_id": "123",
             "validation_accuracy": 0.9,
             "evidence": [],
             "item": {"arxiv_id": "2601.20757"}
        }
        self.write_json(self.bundle_dir / "evidence/index.json", index)

        result = subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(self.bundle_dir)],
            capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, f"Script failed on allowed substrings: {result.stderr}")

if __name__ == '__main__':
    unittest.main()
