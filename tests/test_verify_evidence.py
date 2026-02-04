import unittest
import pathlib
import json
import shutil
import tempfile
from scripts.verify_evidence import validate_file, check_determinism

class TestVerifyEvidence(unittest.TestCase):
    def setUp(self):
        self.test_dir = pathlib.Path(tempfile.mkdtemp())
        self.evd_dir = self.test_dir / "evidence"
        self.evd_dir.mkdir()
        self.schema_dir = self.evd_dir / "schema"
        self.schema_dir.mkdir()

        # Copy real schemas to temp dir for testing
        real_schema_dir = pathlib.Path(__file__).resolve().parents[1] / "evidence" / "schema"
        for schema_file in real_schema_dir.glob("*.schema.json"):
            shutil.copy(schema_file, self.schema_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_validate_valid_report(self):
        report_path = self.evd_dir / "report.json"
        report_data = {
            "evidence_id": "EVD-TEST-001",
            "item_slug": "test-item",
            "claims": [
                {
                    "claim_id": "C1",
                    "text": "The earth is round.",
                    "extractor": "manual",
                    "confidence": 1.0
                }
            ],
            "assessments": []
        }
        report_path.write_text(json.dumps(report_data))

        # Patching global variables in scripts.verify_evidence
        import scripts.verify_evidence
        original_evd = scripts.verify_evidence.EVD
        original_schema_dir = scripts.verify_evidence.SCHEMA_DIR
        scripts.verify_evidence.EVD = self.evd_dir
        scripts.verify_evidence.SCHEMA_DIR = self.schema_dir

        try:
            self.assertTrue(validate_file(report_path, "report"))
        finally:
            scripts.verify_evidence.EVD = original_evd
            scripts.verify_evidence.SCHEMA_DIR = original_schema_dir

    def test_validate_invalid_report(self):
        report_path = self.evd_dir / "report.json"
        report_data = {
            "evidence_id": "EVD-TEST-001",
            # missing item_slug
            "claims": []
        }
        report_path.write_text(json.dumps(report_data))

        import scripts.verify_evidence
        original_evd = scripts.verify_evidence.EVD
        original_schema_dir = scripts.verify_evidence.SCHEMA_DIR
        scripts.verify_evidence.EVD = self.evd_dir
        scripts.verify_evidence.SCHEMA_DIR = self.schema_dir

        try:
            self.assertFalse(validate_file(report_path, "report"))
        finally:
            scripts.verify_evidence.EVD = original_evd
            scripts.verify_evidence.SCHEMA_DIR = original_schema_dir

if __name__ == "__main__":
    unittest.main()
