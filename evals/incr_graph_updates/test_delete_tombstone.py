import unittest
from summit_rt.incremental.delta_extract_snapshotdiff import compute_delta

class TestDeleteTombstone(unittest.TestCase):
    def test_delete_creates_tombstone(self):
        old_nodes = {"user:jules": {"uid": "user:jules", "name": "Jules"}}
        new_nodes = {} # Jules deleted

        ops = compute_delta(old_nodes, new_nodes, {}, {})

        self.assertEqual(len(ops), 1)
        self.assertEqual(ops[0].op, "TOMBSTONE_NODE")
        self.assertEqual(ops[0].uid, "user:jules")
        self.assertEqual(ops[0].reason, "missing_in_new_snapshot")

if __name__ == '__main__':
    unittest.main()
