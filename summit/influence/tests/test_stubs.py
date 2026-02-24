import unittest
from summit.graph.model import Node, Edge
from summit.influence.pfidg import PFIDGAnalyzer
from summit.influence.coc_ew import CoCAnalyzer
from summit.influence.cwc import CwCDetector
from summit.influence.ipnf import IPNFAnalyzer
from summit.influence.irces import IRCESScorer

class TestInfluenceStubs(unittest.TestCase):
    def setUp(self):
        self.nodes = [
            Node(id="actor_1", type="actor", platform="x", attrs={}),
            Node(id="content_1", type="content", platform="x", attrs={}, provenance_id="EVD-1"),
            Node(id="process_1", type="process_frame", platform=None, attrs={"frame_type": "recursive_review"})
        ]
        self.edges = [
            Edge(src="actor_1", dst="content_1", type="engages", ts=1000)
        ]

    def test_pfidg(self):
        analyzer = PFIDGAnalyzer(evidence_root=None)
        result = analyzer.analyze_propagation(self.nodes, self.edges)
        self.assertIn("influence_likelihood", result)
        self.assertFalse(result["provenance_verified"]) # actor_1 missing provenance

    def test_coc(self):
        analyzer = CoCAnalyzer()
        slices = [
            {"volume": 10},
            {"volume": 20},
            {"volume": 35}
        ]
        result = analyzer.compute_metrics(slices)
        self.assertEqual(result["narrative_velocity"], 15.0)
        self.assertEqual(result["narrative_curvature"], 5.0)

    def test_cwc(self):
        detector = CwCDetector()
        result = detector.score_coordination(self.nodes, self.edges)
        self.assertGreater(result["coordination_score"], 0)

    def test_ipnf(self):
        analyzer = IPNFAnalyzer()
        result = analyzer.identify_process_attacks(self.nodes)
        self.assertEqual(result["frame_recurrence_count"], 1)
        self.assertIn("recursive_review", result["detected_frames"])

    def test_irces(self):
        scorer = IRCESScorer()
        result = scorer.compute_risk_envelope("actor_1", {})
        self.assertEqual(result["entity_id"], "actor_1")
        self.assertIn("causal_envelope", result)

if __name__ == "__main__":
    unittest.main()
