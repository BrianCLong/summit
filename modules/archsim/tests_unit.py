import unittest
import json
import os
from modules.archsim.sim.simulate import simulate
from modules.archsim.audit.auditors import find_spofs, bottleneck_risks

class TestArchSim(unittest.TestCase):
    def setUp(self):
        with open("fixtures/archsim/valid_minimal.json", "r") as f:
            self.valid_spec = json.load(f)

    def test_simulation_deterministic(self):
        scenario = {"rps": 500}
        res1 = simulate(self.valid_spec, scenario)
        res2 = simulate(self.valid_spec, scenario)
        self.assertEqual(res1, res2)
        self.assertGreater(res1.p95_ms, 0)
        self.assertGreater(res1.cost_usd_per_day, 0)

    def test_spof_auditor(self):
        findings = find_spofs(self.valid_spec)
        # valid_minimal has replicas: 2 for db, 3 for api. No SPOF.
        self.assertEqual(len(findings), 0)

        # Add SPOF
        spof_spec = self.valid_spec.copy()
        spof_spec["components"] = spof_spec["components"] + [{
            "name": "fragile-cache",
            "type": "cache",
            "replicas": 1
        }]
        findings = find_spofs(spof_spec)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["kind"], "spof")

    def test_bottleneck_auditor(self):
        metrics = {"saturation": 0.9, "p99_ms": 600, "error_rate": 0.02}
        findings = bottleneck_risks(metrics)
        self.assertEqual(len(findings), 3)

if __name__ == "__main__":
    unittest.main()
