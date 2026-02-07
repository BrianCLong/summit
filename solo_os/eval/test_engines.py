import unittest
from solo_os.engines.registry import registry
from solo_os.engines.signal_engine import SignalEngine
from solo_os.engines.revenue_engine import RevenueEngine
from solo_os.engines.orchestration_engine import OrchestrationEngine
from solo_os.engines.content_engine import ContentEngine
from solo_os.engines.base import RunRequest
from pathlib import Path
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
        req = RunRequest(engine="signal_engine", mode="execute", payload={"run_id": "test_block", "action": "outbound"})
        res = registry.run(req)
        self.assertFalse(res.ok)
        self.assertIn("blocked by governance", res.summary["error"])

if __name__ == "__main__":
    unittest.main()
