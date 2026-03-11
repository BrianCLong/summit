from __future__ import annotations

import os
import unittest

from cogwar.innovation.defensive_friction_planner import build_defensive_friction_plan
from cogwar.iw.warning import generate_warning


class DefensiveFrictionPlannerTests(unittest.TestCase):
    def setUp(self) -> None:
        self._prior = os.environ.get("COGWAR_INNOVATION")
        os.environ["COGWAR_INNOVATION"] = "true"
        self.indicators = [
            {
                "id": "IND-001",
                "name": "Narrative Surge",
                "modality": "info",
                "severity": "high",
                "confidence": 0.86,
            },
            {
                "id": "IND-002",
                "name": "Synchronized Amplification",
                "modality": "social",
                "severity": "critical",
                "confidence": 0.79,
            },
        ]

    def tearDown(self) -> None:
        if self._prior is None:
            os.environ.pop("COGWAR_INNOVATION", None)
        else:
            os.environ["COGWAR_INNOVATION"] = self._prior

    def test_build_plan_returns_risk_reduction(self) -> None:
        plan = build_defensive_friction_plan(self.indicators)
        self.assertGreater(plan["projected_risk_reduction"], 0.0)
        self.assertGreaterEqual(plan["projected_residual_risk"], 0.0)
        self.assertLessEqual(plan["projected_residual_risk"], 1.0)
        self.assertGreaterEqual(plan["total_cost"], 0.0)

    def test_non_defensive_intervention_rejected(self) -> None:
        bad_catalog = [
            {
                "id": "offensive-seeding",
                "name": "Offensive Seeding",
                "intent": "offensive",
                "target_channels": ["broadcast"],
                "friction_gain": 0.2,
                "decay_gain": 0.1,
                "cost": 0.5,
                "reversibility": 0.1,
                "latency_steps": 0,
            }
        ]
        with self.assertRaises(ValueError):
            build_defensive_friction_plan(self.indicators, intervention_catalog=bad_catalog)

    def test_generate_warning_includes_plan_when_enabled(self) -> None:
        catalog = [
            {
                "id": "prebunk-cells",
                "name": "Prebunking Cells",
                "intent": "defensive",
                "target_channels": ["broadcast", "community"],
                "friction_gain": 0.16,
                "decay_gain": 0.05,
                "cost": 1.2,
                "reversibility": 0.95,
                "latency_steps": 0,
            }
        ]
        warning = generate_warning(self.indicators, intervention_catalog=catalog)
        self.assertIn("defensive_plan", warning)
        self.assertEqual(warning["recommended_defensive_actions"], ["Prebunking Cells"])

    def test_generate_warning_falls_back_when_disabled(self) -> None:
        os.environ["COGWAR_INNOVATION"] = "false"
        warning = generate_warning(self.indicators, intervention_catalog=[])
        self.assertNotIn("defensive_plan", warning)
        self.assertIn("Monitor specific channels", warning["recommended_defensive_actions"][0])


if __name__ == "__main__":
    unittest.main()
