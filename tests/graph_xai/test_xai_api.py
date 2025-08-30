
import unittest
import os
import sys

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

from graph_xai.xai_api import (
    generate_counterfactuals,
    get_path_rationales,
    calculate_saliency_map,
    assess_fairness,
    assess_robustness
)

class TestXaiApiStubs(unittest.TestCase):

    def test_generate_counterfactuals(self):
        result = generate_counterfactuals({}, "node1", "positive")
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)

    def test_get_path_rationales(self):
        result = get_path_rationales({}, ["nodeA", "nodeB"])
        self.assertIn("reason", result)
        self.assertIn("confidence", result)

    def test_calculate_saliency_map(self):
        result = calculate_saliency_map({}, "node1")
        self.assertIn("node_importance", result)

    def test_assess_fairness(self):
        result = assess_fairness({}, "gender")
        self.assertIn("disparity_score", result)
        self.assertIn("bias_detected", result)

    def test_assess_robustness(self):
        result = assess_robustness({}, "noise")
        self.assertIn("robustness_score", result)
        self.assertIn("vulnerable_nodes", result)

if __name__ == '__main__':
    unittest.main()
