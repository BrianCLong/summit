import unittest
import sys
import os
import json

# Add tools/ci to path to import verify_evidence_bundle
REPO_ROOT = os.getcwd()
sys.path.append(os.path.join(REPO_ROOT, 'tools/ci'))

try:
    import verify_evidence_bundle
except ImportError:
    pass

class TestVerifyEvidenceBundle(unittest.TestCase):

    def test_check_timestamp_locality_valid(self):
        data = {"key": "value", "nested": {"key2": "value2"}}
        self.assertTrue(verify_evidence_bundle.check_timestamp_locality(data, "test.json"))

    def test_check_timestamp_locality_invalid_key(self):
        data = {"timestamp": "2026-01-01"}
        # Redirect stdout to suppress error message
        with open(os.devnull, 'w') as f:
            old_stdout = sys.stdout
            sys.stdout = f
            try:
                self.assertFalse(verify_evidence_bundle.check_timestamp_locality(data, "test.json"))
            finally:
                sys.stdout = old_stdout

    def test_check_timestamp_locality_invalid_nested(self):
        data = {"nested": {"created_at": "now"}}
        with open(os.devnull, 'w') as f:
            old_stdout = sys.stdout
            sys.stdout = f
            try:
                self.assertFalse(verify_evidence_bundle.check_timestamp_locality(data, "test.json"))
            finally:
                sys.stdout = old_stdout

    def test_check_evidence_required_valid(self):
        data = {"candidates": [{"source_refs": ["ref1"]}]}
        self.assertTrue(verify_evidence_bundle.check_evidence_required(data, "test.json"))

    def test_check_evidence_required_invalid_empty(self):
        data = {"candidates": [{"source_refs": []}]}
        with open(os.devnull, 'w') as f:
            old_stdout = sys.stdout
            sys.stdout = f
            try:
                self.assertFalse(verify_evidence_bundle.check_evidence_required(data, "test.json"))
            finally:
                sys.stdout = old_stdout

    def test_check_evidence_required_invalid_missing(self):
        data = {"candidates": [{"name": "foo"}]}
        with open(os.devnull, 'w') as f:
            old_stdout = sys.stdout
            sys.stdout = f
            try:
                self.assertFalse(verify_evidence_bundle.check_evidence_required(data, "test.json"))
            finally:
                sys.stdout = old_stdout

if __name__ == '__main__':
    unittest.main()
