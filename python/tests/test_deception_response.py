import json
import os
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

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
        agent.register_playbook(
            "inject",
            "deploy counter message",
            severity="moderate",
            channels=("sms", "radio"),
            tags=("messaging",),
        )
        log = agent.trigger("decoy-1", "inject", confidence=0.6, note="initial push")
        self.assertEqual(log["target"], "decoy-1")
        self.assertEqual(log["playbook"], "inject")
        self.assertEqual(log["agent_version"], "1.2")
        self.assertEqual(log["severity"], "moderate")
        self.assertIn("timestamp", log)
        history = agent.get_history()
        self.assertEqual(history, [log])
        summary = agent.summarize_history()
        self.assertEqual(summary["total_actions"], 1)
        self.assertEqual(summary["by_playbook"], {"inject": 1})
        self.assertEqual(summary["by_target"], {"decoy-1": 1})
        agent.reset()
        self.assertEqual(agent.get_history(), [])

    def test_playbook_registry_management_and_filters(self):
        agent = CounterResponseAgent()
        agent.register_playbook(
            "inject",
            "deploy counter message",
            channels=("social",),
            tags=("rapid", "messaging"),
        )
        agent.register_playbook("block", "block malicious actor", tags=("containment",))
        playbooks = agent.list_playbooks()
        self.assertIn("inject", playbooks)
        self.assertEqual(playbooks["inject"]["channels"], ["social"])
        self.assertTrue(agent.deregister_playbook("block"))
        with self.assertRaises(ValueError):
            agent.trigger("t", "block")
        agent.trigger("t1", "inject", additional_tags=("priority",))
        agent.trigger("t2", "inject")
        filtered = agent.get_history(target="t1", tags=("messaging", "priority"))
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["target"], "t1")

    def test_history_export_and_load_playbooks(self):
        agent = CounterResponseAgent()
        agent.register_playbook(
            "inject", "deploy counter message", metadata={"owner": "ops"}, cooldown_seconds=5
        )
        agent.trigger("t1", "inject", confidence=0.9)
        with tempfile.TemporaryDirectory() as tmp:
            history_path = Path(tmp, "history.json")
            playbooks_path = Path(tmp, "playbooks.json")
            agent.export_history(history_path)
            agent.save_playbooks(playbooks_path)
            exported = json.loads(history_path.read_text("utf-8"))
            self.assertEqual(exported[0]["id"], 1)
            self.assertIn("metadata", exported[0])

            new_agent = CounterResponseAgent()
            loaded = new_agent.load_playbooks(playbooks_path)
            self.assertEqual(loaded, 1)
            self.assertIn("inject", new_agent.list_playbooks())

    def test_prerequisites_and_cooldown_enforcement(self):
        agent = CounterResponseAgent()
        agent.register_playbook("prep", "prepare context")
        agent.register_playbook(
            "escalate",
            "escalate response",
            prerequisites=("prep",),
            cooldown_seconds=30,
        )
        with self.assertRaises(ValueError):
            agent.trigger("x", "escalate")
        agent.trigger("x", "prep")
        agent.trigger("x", "escalate")
        with self.assertRaises(ValueError):
            agent.trigger("y", "escalate")
        # Manually age the last action to bypass cooldown
        past = (datetime.utcnow() - timedelta(seconds=31)).isoformat()
        agent.history[-1]["timestamp"] = past
        agent.trigger("y", "escalate")

    def test_get_history_with_time_bounds_and_limit(self):
        agent = CounterResponseAgent()
        agent.register_playbook("inject", "deploy counter message")
        before = datetime.utcnow().isoformat()
        agent.trigger("t1", "inject")
        midpoint = datetime.utcnow()
        agent.trigger("t2", "inject")
        after = datetime.utcnow() + timedelta(seconds=1)
        recent = agent.get_history(since=midpoint, limit=1)
        self.assertEqual(len(recent), 1)
        self.assertEqual(recent[0]["target"], "t2")
        bounded = agent.get_history(since=before, until=after.isoformat())
        self.assertEqual(len(bounded), 2)

    def test_trigger_requires_known_playbook(self):
        agent = CounterResponseAgent()
        with self.assertRaises(ValueError):
            agent.trigger("decoy-1", "unknown")


if __name__ == "__main__":
    unittest.main()
