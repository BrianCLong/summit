import unittest
import sys
import os

# Ensure src is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from narrative_intel.pipeline.extract_skeleton import NarrativeSkeletonExtractor

class TestNarrativeSkeletonExtractor(unittest.TestCase):
    def test_determinism(self):
        extractor = NarrativeSkeletonExtractor()
        input_data = {
            "doc_id": "doc_123",
            "text": "This is a test narrative.",
            "lang": "en",
            "tenant_id": "tenant_abc",
            "timestamp": "2023-10-27T10:00:00Z"
        }

        result1 = extractor.process(**input_data)
        result2 = extractor.process(**input_data)

        self.assertEqual(result1["signals"]["structure_fingerprint"], result2["signals"]["structure_fingerprint"])
        self.assertEqual(result1["timestamp"], "2023-10-27T10:00:00Z")
        self.assertEqual(result1, result2)

if __name__ == "__main__":
    unittest.main()
