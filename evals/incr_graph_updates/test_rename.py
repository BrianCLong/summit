import unittest
from summit_rt.incremental.delta_ops import DeltaOp
from summit_rt.incremental.delta_extract_snapshotdiff import compute_delta

class TestRename(unittest.TestCase):
    def test_rename_entity(self):
        # Rename logic usually depends on stable UID.
        # If UID is stable, a rename is just a property update.
        old_nodes = {"user:jules": {"uid": "user:jules", "name": "Jules"}}
        new_nodes = {"user:jules": {"uid": "user:jules", "name": "Jules V2"}}

        ops = compute_delta(old_nodes, new_nodes, {}, {})

        self.assertEqual(len(ops), 1)
        self.assertEqual(ops[0].op, "UPSERT_NODE")
        self.assertEqual(ops[0].uid, "user:jules")
        self.assertEqual(ops[0].props["name"], "Jules V2")

if __name__ == '__main__':
    unittest.main()
