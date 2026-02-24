import unittest
import os
import json
from summit.context.packer import ContextPacker, ContextItem

class TestContextPacker(unittest.TestCase):
    def test_pack_budget(self):
        packer = ContextPacker(max_tokens=100)
        items = [
            ContextItem(content="A", tokens=40, score=0.9, source="high"),
            ContextItem(content="B", tokens=50, score=0.8, source="med"),
            ContextItem(content="C", tokens=30, score=0.5, source="low"),
        ]

        packed = packer.pack(items)

        self.assertEqual(len(packed), 2)
        self.assertEqual(packed[0].content, "A")
        self.assertEqual(packed[1].content, "B")

        # Generate metrics artifact
        metrics = packer.get_metrics(items, packed)
        artifact_path = "artifacts/evidence/context/context_pack.metrics.json"
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        with open(artifact_path, "w") as f:
            json.dump(metrics, f, indent=2)

    def test_metrics(self):
        packer = ContextPacker(max_tokens=100)
        items = [
            ContextItem(content="A", tokens=120, score=1.0, source="huge")
        ]
        packed = packer.pack(items)
        metrics = packer.get_metrics(items, packed)

        self.assertEqual(metrics["packed_items"], 0)
        self.assertEqual(metrics["dropped_items"], 1)

if __name__ == '__main__':
    unittest.main()
