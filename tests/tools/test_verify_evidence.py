import sys
import json
import unittest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch

# Add repo root to path to import tools
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

# Import the module
from tools import verify_evidence_schemas

class TestVerifyEvidence(unittest.TestCase):
    def setUp(self):
        self.test_dir = Path(tempfile.mkdtemp())
        self.schemas_dir = self.test_dir / "schemas" / "evidence"
        self.schemas_dir.mkdir(parents=True)
        self.evidence_dir = self.test_dir / "evidence"
        self.evidence_dir.mkdir(parents=True)

        # Patch constants in the module
        self.orig_root = verify_evidence_schemas.ROOT
        self.orig_schemas_dir = verify_evidence_schemas.SCHEMAS_DIR
        self.orig_evidence_index = verify_evidence_schemas.EVIDENCE_INDEX

        verify_evidence_schemas.ROOT = self.test_dir
        verify_evidence_schemas.SCHEMAS_DIR = self.schemas_dir
        verify_evidence_schemas.EVIDENCE_INDEX = self.evidence_dir / "index.json"

        # Create dummy schemas
        self.create_schema("index.schema.json", {
            "type": "object",
            "required": ["version", "items"],
            "properties": {
                "version": {"type": "string"},
                "items": {"type": "array"}
            }
        })
        self.create_schema("report.schema.json", {
            "type": "object",
            "required": ["evidence_id"],
            "properties": {"evidence_id": {"type": "string"}}
        })
        self.create_schema("metrics.schema.json", {"type": "object"})
        self.create_schema("stamp.schema.json", {"type": "object"})

    def tearDown(self):
        verify_evidence_schemas.ROOT = self.orig_root
        verify_evidence_schemas.SCHEMAS_DIR = self.orig_schemas_dir
        verify_evidence_schemas.EVIDENCE_INDEX = self.orig_evidence_index
        shutil.rmtree(self.test_dir)

    def create_schema(self, name, content):
        with open(self.schemas_dir / name, 'w') as f:
            json.dump(content, f)

    def create_file(self, path, content):
        path = self.test_dir / path
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(content, f)

    def test_valid_evidence(self):
        # Create index
        self.create_file("evidence/index.json", {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-001",
                    "files": {
                        "report": "evidence/run1/report.json",
                        "metrics": "evidence/run1/metrics.json",
                        "stamp": "evidence/run1/stamp.json"
                    }
                }
            ]
        })

        # Create artifacts
        self.create_file("evidence/run1/report.json", {"evidence_id": "EVD-TEST-001"})
        self.create_file("evidence/run1/metrics.json", {"total_events": 10})
        self.create_file("evidence/run1/stamp.json", {"generated_at": "2023-01-01"})

        with patch('sys.exit') as mock_exit:
            verify_evidence_schemas.main()
            mock_exit.assert_not_called()

    def test_forbidden_timestamp(self):
        self.create_file("evidence/index.json", {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-001",
                    "files": {
                        "report": "evidence/run1/report.json",
                        "metrics": "evidence/run1/metrics.json",
                        "stamp": "evidence/run1/stamp.json"
                    }
                }
            ]
        })
        self.create_file("evidence/run1/report.json", {
            "evidence_id": "EVD-TEST-001",
            "created_at": "2023-01-01" # Forbidden
        })
        self.create_file("evidence/run1/metrics.json", {})
        self.create_file("evidence/run1/stamp.json", {})

        with patch('sys.exit') as mock_exit:
            verify_evidence_schemas.main()
            mock_exit.assert_called_with(1)

    def test_missing_file(self):
        self.create_file("evidence/index.json", {
            "version": "1.0",
            "items": [
                {
                    "evidence_id": "EVD-TEST-001",
                    "files": {
                        "report": "evidence/run1/report.json",
                        "metrics": "evidence/run1/metrics.json",
                        "stamp": "evidence/run1/stamp.json"
                    }
                }
            ]
        })
        # Missing report
        self.create_file("evidence/run1/metrics.json", {})
        self.create_file("evidence/run1/stamp.json", {})

        with patch('sys.exit') as mock_exit:
            verify_evidence_schemas.main()
            mock_exit.assert_called_with(1)

if __name__ == "__main__":
    unittest.main()
