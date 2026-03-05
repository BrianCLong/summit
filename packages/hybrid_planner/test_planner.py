import unittest

from planner import GVGPlanner, HybridPlanner


class TestGVGPlanner(unittest.TestCase):
    def setUp(self):
        self.planner = GVGPlanner(similarity_threshold=0.8, max_depth=5)

    def test_plan_gvg_structure(self):
        plan = self.planner.plan_gvg("test query")
        self.assertIn("stages", plan)
        self.assertEqual(len(plan["stages"]), 3)
        self.assertEqual(plan["stages"][0]["type"], "vector")
        self.assertEqual(plan["stages"][1]["type"], "graph")
        self.assertEqual(plan["stages"][2]["type"], "evidence")
        self.assertEqual(plan["metadata"]["constraints"]["max_depth"], 5)

class TestHybridPlanner(unittest.TestCase):
    def setUp(self):
        self.planner = HybridPlanner()

    def test_plan_calls_gvg(self):
        plan = self.planner.plan("test query")
        self.assertEqual(plan["metadata"]["intent"], "Hybrid Retrieval")

if __name__ == "__main__":
    unittest.main()
