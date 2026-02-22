import unittest
import json
from unittest.mock import MagicMock
from summit_rt.incremental.delta_extract_snapshotdiff import compute_delta
from summit_rt.incremental.neo4j_delta_apply import apply_ops

class TestIncrementalUpdates(unittest.TestCase):
    def setUp(self):
        with open('fixtures/software_graph_v1.json') as f:
            self.v1 = json.load(f)
        with open('fixtures/software_graph_v2.json') as f:
            self.v2 = json.load(f)

    def test_delta_extraction(self):
        ops = compute_delta(
            self.v1['nodes'], self.v2['nodes'],
            self.v1['edges'], self.v2['edges']
        )

        # Expect:
        # 1. UPSERT user:jules (role changed)
        # 2. UPSERT user:newhire (new)
        # 3. UPSERT rel:new_contrib (new)
        # 4. No tombstone

        op_types = [op.op for op in ops]
        self.assertIn("UPSERT_NODE", op_types)
        self.assertIn("UPSERT_EDGE", op_types)

        # Verify specific ops
        jules_ops = [op for op in ops if op.uid == "user:jules"]
        self.assertTrue(jules_ops)
        self.assertEqual(jules_ops[0].props['role'], 'lead_engineer')

        newhire_ops = [op for op in ops if op.uid == "user:newhire"]
        self.assertTrue(newhire_ops)

    def test_delta_apply(self):
        ops = compute_delta(
            self.v1['nodes'], self.v2['nodes'],
            self.v1['edges'], self.v2['edges']
        )

        mock_tx = MagicMock()
        stats = apply_ops(mock_tx, ops, ingest_time="2023-10-27T10:00:00Z")

        self.assertTrue(stats['upsert_nodes'] > 0)
        # Check that tx.run was called
        self.assertTrue(mock_tx.run.called)

if __name__ == '__main__':
    unittest.main()
