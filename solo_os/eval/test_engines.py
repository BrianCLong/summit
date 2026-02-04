import unittest
from solo_os.engines.registry import registry
from solo_os.engines.signal_engine import SignalEngine
from solo_os.engines.revenue_engine import RevenueEngine
from solo_os.engines.orchestration_engine import OrchestrationEngine
from solo_os.engines.content_engine import ContentEngine
from solo_os.engines.base import RunRequest
from solo_os.governance.gate import GovernanceGate
from solo_os.engines.registry import EngineRegistry
from pathlib import Path
import json
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
        req = RunRequest(
            engine="signal_engine",
            mode="execute",
            payload={"run_id": "test_block", "action": "outbound"},
            idempotency_key="key123"
        )
        res = registry.run(req)
        self.assertFalse(res.ok)
        self.assertIn("blocked by governance", res.summary["error"])

    def test_execute_requires_idempotency_key(self):
        req = RunRequest(
            engine="signal_engine",
            mode="execute",
            payload={"run_id": "test_no_key"}
        )
        res = registry.run(req)
        self.assertFalse(res.ok)
        self.assertIn("requires an idempotency_key", res.summary["error"])

    def test_execute_with_audit(self):
        # Use a custom gate with overrides
        policy_path = "solo_os/governance/policy.test_overrides.json"
        gate = GovernanceGate(policy_path)
        custom_registry = EngineRegistry(gate)
        custom_registry.register(SignalEngine())

        req = RunRequest(
            engine="signal_engine",
            mode="execute",
            payload={"run_id": "test_audit", "action": "send_message", "connector": "slack"},
            idempotency_key="key_audit_123"
        )
        res = custom_registry.run(req)
        self.assertTrue(res.ok, res.summary.get("error"))

        audit_path = Path(res.evidence_path) / "audit.json"
        self.assertTrue(audit_path.exists())

        with open(audit_path, "r") as f:
            audit_data = json.load(f)
            self.assertEqual(audit_data["mode"], "execute")
            self.assertEqual(audit_data["idempotency_key"], "key_audit_123")
            self.assertEqual(audit_data["connector"], "slack")

if __name__ == "__main__":
    unittest.main()
