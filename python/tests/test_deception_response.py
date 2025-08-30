import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
import unittest

from counter_response_agent import CounterResponseAgent
from deception_graph_builder import DeceptionGraphBuilder


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

    def test_counter_agent_logging_and_history(self):
        agent = CounterResponseAgent(version="1.2")
        agent.register_playbook("inject", "deploy counter message")
        log = agent.trigger("decoy-1", "inject")
        self.assertEqual(log["target"], "decoy-1")
        self.assertEqual(log["playbook"], "inject")
        self.assertEqual(log["agent_version"], "1.2")
        self.assertIn("timestamp", log)
        self.assertEqual(agent.get_history(), [log])
        agent.reset()
        self.assertEqual(agent.get_history(), [])

    def test_playbook_registry_management_and_filters(self):
        agent = CounterResponseAgent()
        agent.register_playbook("inject", "deploy counter message")
        agent.register_playbook("block", "block malicious actor")
        self.assertIn("inject", agent.list_playbooks())
        self.assertTrue(agent.deregister_playbook("block"))
        with self.assertRaises(ValueError):
            agent.trigger("t", "block")
        agent.trigger("t1", "inject")
        agent.trigger("t2", "inject")
        filtered = agent.get_history(target="t1")
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["target"], "t1")

    def test_history_export(self):
        agent = CounterResponseAgent()
        agent.register_playbook("inject", "deploy counter message")
        agent.trigger("t1", "inject", confidence=0.9)
        import tempfile, json
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "history.json")
            agent.export_history(path)
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        self.assertEqual(data[0]["id"], 1)
        self.assertEqual(data[0]["playbook"], "inject")

    def test_trigger_requires_known_playbook(self):
        agent = CounterResponseAgent()
        with self.assertRaises(ValueError):
            agent.trigger("decoy-1", "unknown")


if __name__ == "__main__":
    unittest.main()
