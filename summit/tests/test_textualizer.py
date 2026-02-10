
import unittest
import json
from summit.textualizer.core import to_context_pack

class TestContextPack(unittest.TestCase):
    def test_deterministic_output(self):
        paths = ["b/traj.json", "a/traj.json"]
        result1 = to_context_pack(paths)

        paths_reversed = ["a/traj.json", "b/traj.json"]
        result2 = to_context_pack(paths_reversed)

        self.assertEqual(result1, result2)

    def test_json_structure(self):
        result = to_context_pack(["test.json"])
        data = json.loads(result.decode('utf-8'))
        self.assertIn("test.json", data)

if __name__ == '__main__':
    unittest.main()
