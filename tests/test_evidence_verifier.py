import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

# Add scripts to path so we can import verify_evidence if needed,
# but we'll mostly run it as a subprocess or import main.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scripts import verify_evidence


class TestEvidenceVerifier(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.evidence_dir = Path(self.test_dir) / "evidence"
        self.evidence_dir.mkdir()

        # Patch verify_evidence.ROOT and EVID
        self.original_root = verify_evidence.ROOT
        self.original_evid = verify_evidence.EVID
        verify_evidence.ROOT = Path(self.test_dir)
        verify_evidence.EVID = self.evidence_dir

    def tearDown(self):
        verify_evidence.ROOT = self.original_root
        verify_evidence.EVID = self.original_evid
        shutil.rmtree(self.test_dir)

    def create_required_files(self, index_content=None):
        if index_content is None:
            index_content = {"version": "1.0", "evidence": {}}

        (self.evidence_dir / "index.json").write_text(json.dumps(index_content))
        (self.evidence_dir / "report.json").write_text(json.dumps({"id": "test"}))
        (self.evidence_dir / "metrics.json").write_text(json.dumps({"val": 1}))
        (self.evidence_dir / "stamp.json").write_text(json.dumps({"ts": "2026-01-27"}))

    def test_pass_minimal_compliant(self):
        self.create_required_files()
        self.assertEqual(verify_evidence.main(), 0)

    def test_fail_missing_files(self):
        (self.evidence_dir / "index.json").write_text(json.dumps({"evidence": {}}))
        # missing others
        self.assertEqual(verify_evidence.main(), 2)

    def test_fail_invalid_index(self):
        self.create_required_files(index_content={"no_evidence_key": {}})
        self.assertEqual(verify_evidence.main(), 3)

    def test_fail_timestamp_outside_stamp(self):
        self.create_required_files()
        # Add a file with a timestamp
        (self.evidence_dir / "other.json").write_text(json.dumps({"date": "2026-01-27T10:00:00Z"}))
        self.assertEqual(verify_evidence.main(), 4)

if __name__ == "__main__":
    unittest.main()
