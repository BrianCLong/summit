import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
import unittest

from deception_graph_builder import DeceptionGraphBuilder
from counter_response_agent import CounterResponseAgent


class TestDeceptionResponse(unittest.TestCase):
    def test_decoy_metadata_and_edge(self):
        builder = DeceptionGraphBuilder()
        decoy_id = builder.create_decoy(
            "real-node", trap_type="service", bait_score=0.5, deception_level="high"
        )
        attrs = builder.nodes[decoy_id]
        self.assertEqual(attrs["deception_level"], "high")
        self.assertEqual(attrs["trap_type"], "service")
        self.assertEqual(attrs["bait_score"], 0.5)
        self.assertIn((decoy_id, "real-node"), builder.edges)
        self.assertEqual(builder.edges[(decoy_id, "real-node")]["type"], "DECOY_OF")

    def test_counter_agent_logging(self):
        agent = CounterResponseAgent(version="1.2")
        agent.register_playbook("inject", "basic injection")
        log = agent.trigger("decoy-1", "inject", confidence=0.7)
        self.assertEqual(log["target"], "decoy-1")
        self.assertEqual(log["playbook"], "inject")
        self.assertEqual(log["agent_version"], "1.2")
        self.assertIn("timestamp", log)
        history = agent.get_history()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["confidence"], 0.7)

    def test_unknown_playbook_raises(self):
        agent = CounterResponseAgent()
        with self.assertRaises(ValueError):
            agent.trigger("decoy-1", "nope")

if __name__ == "__main__":
    unittest.main()
