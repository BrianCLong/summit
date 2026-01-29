
import subprocess
import os
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
VERIFIER = ROOT / "tools/ci/verify_evidence.py"
FIXTURES = ROOT / "evidence/fixtures"

class TestVerifyEvidence(unittest.TestCase):
    def run_verifier(self, index_path):
        cmd = [str(VERIFIER), "--index", str(index_path)]
        return subprocess.run(cmd, capture_output=True, text=True)

    def test_good_bundle(self):
        index = FIXTURES / "good/index.json"
        res = self.run_verifier(index)
        self.assertEqual(res.returncode, 0, f"Good bundle failed: {res.stderr}")
        self.assertIn("[verify_evidence] OK", res.stdout)

    def test_missing_file(self):
        index = FIXTURES / "bad/missing_file/index.json"
        res = self.run_verifier(index)
        self.assertNotEqual(res.returncode, 0, "Missing file should fail")
        self.assertIn("missing file on disk", res.stderr)

    def test_bad_timestamp(self):
        index = FIXTURES / "bad/bad_timestamp/index.json"
        res = self.run_verifier(index)
        self.assertNotEqual(res.returncode, 0, "Bad timestamp should fail")
        self.assertIn("Timestamp key 'generated_at' found in", res.stderr)

    def test_bad_id(self):
        index = FIXTURES / "bad/bad_id/index.json"
        res = self.run_verifier(index)
        self.assertNotEqual(res.returncode, 0, "Bad ID should fail")
        self.assertIn("Invalid Evidence ID format", res.stderr)

if __name__ == "__main__":
    unittest.main()
