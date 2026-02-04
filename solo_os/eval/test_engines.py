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

class TestEngines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        registry.register(SignalEngine())
        registry.register(RevenueEngine())
        registry.register(OrchestrationEngine())
        registry.register(ContentEngine())

    def test_signal_engine_run(self):
        req = RunRequest(engine="signal_engine", mode="dry_run", payload={"run_id": "test_sig"})
        res = registry.run(req)
        self.assertTrue(res.ok)
        self.assertTrue(Path(res.evidence_path).exists())
        self.assertTrue((Path(res.evidence_path) / "report.json").exists())
        self.assertTrue((Path(res.evidence_path) / "metrics.json").exists())
        self.assertTrue((Path(res.evidence_path) / "stamp.json").exists())

    def test_all_engines_registered(self):
        engines = ["signal_engine", "revenue_engine", "orchestration_engine", "content_engine"]
        for name in engines:
            req = RunRequest(engine=name, mode="dry_run", payload={"run_id": f"test_{name}"})
            res = registry.run(req)
            self.assertTrue(res.ok, f"Engine {name} failed to run")

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
