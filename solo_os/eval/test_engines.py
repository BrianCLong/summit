import unittest
from solo_os.engines.registry import registry
from solo_os.engines.signal_engine import SignalEngine
from solo_os.engines.revenue_engine import RevenueEngine
from solo_os.engines.orchestration_engine import OrchestrationEngine
from solo_os.engines.content_engine import ContentEngine
from solo_os.engines.base import RunRequest
from pathlib import Path
import shutil
import json

class TestEngines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        registry.register(SignalEngine())
        registry.register(RevenueEngine())
        registry.register(OrchestrationEngine())
        registry.register(ContentEngine())

    def test_signal_engine_mws(self):
        payload = {
            "run_id": "test_sig_mws",
            "topic_seeds": ["AI agents", "Solo entrepreneurship"]
        }
        req = RunRequest(engine="signal_engine", mode="dry_run", payload=payload)
        res = registry.run(req)
        self.assertTrue(res.ok)
        self.assertEqual(len(res.summary["opportunities"]), 2)
        self.assertEqual(res.summary["opportunities"][0]["query_terms"][0], "AI agents")
        self.assertIn("confidence", res.summary["opportunities"][0])

        # Verify local index
        self.assertTrue((Path(res.evidence_path) / "index.json").exists())

    def test_revenue_engine_mws(self):
        payload = {
            "run_id": "test_rev_mws",
            "leads": [
                {"name": "Alice", "state": "new"},
                {"name": "Bob", "state": "engaged"}
            ]
        }
        req = RunRequest(engine="revenue_engine", mode="dry_run", payload=payload)
        res = registry.run(req)
        self.assertTrue(res.ok)
        self.assertEqual(len(res.summary["leads"]), 2)
        self.assertEqual(res.summary["leads"][0]["current_state"], "engaged")
        self.assertEqual(res.summary["leads"][1]["current_state"], "qualified")
        self.assertIn("follow_up_draft", res.summary["leads"][0])

    def test_orchestration_engine_mws(self):
        payload = {
            "run_id": "test_orch_mws",
            "workflow": {
                "steps": [
                    {"name": "Fetch Signals"},
                    {"name": "Generate Content"}
                ]
            }
        }
        req = RunRequest(engine="orchestration_engine", mode="dry_run", payload=payload)
        res = registry.run(req)
        self.assertTrue(res.ok)
        self.assertEqual(len(res.summary["executed_steps"]), 2)
        self.assertEqual(res.summary["executed_steps"][0]["step"], "Fetch Signals")
        self.assertIn("evidence_id", res.summary["executed_steps"][0])

    def test_content_engine_mws(self):
        payload = {
            "run_id": "test_cont_mws",
            "topics": ["Future of Work"]
        }
        req = RunRequest(engine="content_engine", mode="dry_run", payload=payload)
        res = registry.run(req)
        self.assertTrue(res.ok)
        self.assertEqual(len(res.summary["briefs"]), 1)
        self.assertEqual(res.summary["briefs"][0]["topic"], "Future of Work")
        self.assertTrue(len(res.summary["experiments"]) > 0)

    def test_governance_block_execute(self):
        # registry uses default gate which denies everything
        req = RunRequest(engine="signal_engine", mode="execute", payload={"run_id": "test_block", "action": "outbound"})
        res = registry.run(req)
        self.assertFalse(res.ok)
        self.assertIn("blocked by governance", res.summary["error"])

if __name__ == "__main__":
    unittest.main()
