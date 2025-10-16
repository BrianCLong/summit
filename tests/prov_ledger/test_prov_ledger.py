import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.insert(0, project_root)

from prov_ledger.claim_model import Claim, generate_contradiction_graph, parse_claim
from prov_ledger.evidence_registry import (
    _EVIDENCE_STORE,
    generate_signed_hash,
    get_evidence,
    register_evidence,
)
from prov_ledger.export_manifest import generate_export_manifest, verify_export_manifest


class TestProvLedgerStubs(unittest.TestCase):

    def setUp(self):
        # Clear the in-memory store before each test
        _EVIDENCE_STORE.clear()

    def tearDown(self):
        # Clear the in-memory store after each test
        _EVIDENCE_STORE.clear()

    def test_claim_model(self):
        raw_data = {
            "id": "claim1",
            "data": {"fact": "water is wet"},
            "source": "sensor_a",
            "timestamp": "2023-01-01T00:00:00Z",
        }
        claim = parse_claim(raw_data)
        self.assertIsInstance(claim, Claim)
        self.assertEqual(claim.claim_id, "claim1")
        self.assertIn("fact", claim.content)

        claims = [
            claim,
            parse_claim(
                {
                    "id": "claim2",
                    "data": {"fact": "sky is blue"},
                    "source": "sensor_b",
                    "timestamp": "2023-01-01T00:01:00Z",
                }
            ),
        ]
        graph = generate_contradiction_graph(claims)
        self.assertIn("nodes", graph)
        self.assertIn("edges", graph)

    def test_evidence_registration_and_retrieval(self):
        evidence_data_1 = {
            "type": "log",
            "content": "user login event",
            "timestamp": "2023-01-01T10:00:00Z",
        }
        evidence_id_1 = register_evidence(evidence_data_1)
        self.assertIn("evidence-", evidence_id_1)
        self.assertIn(evidence_id_1, _EVIDENCE_STORE)
        self.assertEqual(_EVIDENCE_STORE[evidence_id_1], evidence_data_1)

        retrieved_evidence_1 = get_evidence(evidence_id_1)
        self.assertEqual(retrieved_evidence_1, evidence_data_1)

        # Test with different data
        evidence_data_2 = {
            "type": "alert",
            "content": "malware detected",
            "timestamp": "2023-01-01T11:00:00Z",
        }
        evidence_id_2 = register_evidence(evidence_data_2)
        self.assertNotEqual(evidence_id_1, evidence_id_2)  # Ensure different IDs for different data
        self.assertIn(evidence_id_2, _EVIDENCE_STORE)
        self.assertEqual(_EVIDENCE_STORE[evidence_id_2], evidence_data_2)

        retrieved_evidence_2 = get_evidence(evidence_id_2)
        self.assertEqual(retrieved_evidence_2, evidence_data_2)

        # Test retrieving non-existent evidence
        self.assertEqual(get_evidence("non_existent_id"), {})

    def test_generate_signed_hash(self):
        data = {"data": "some_data", "value": 123}
        signed_hash = generate_signed_hash(data)
        self.assertIn("signed_hash_", signed_hash)

        # Ensure consistent hash for same data
        signed_hash_2 = generate_signed_hash({"data": "some_data", "value": 123})
        self.assertEqual(signed_hash, signed_hash_2)

    def test_export_manifest(self):
        exported_data = [{"item": "data1"}, {"item": "data2"}]
        manifest = generate_export_manifest(exported_data)
        self.assertIn("manifest_id", manifest)
        self.assertIn("root_hash", manifest)
        self.assertIn("transform_chain", manifest)
        self.assertIn("exported_item_hashes", manifest)

        self.assertTrue(verify_export_manifest(manifest, "/usr/local/bin/verifier_cli"))


if __name__ == "__main__":
    unittest.main()
