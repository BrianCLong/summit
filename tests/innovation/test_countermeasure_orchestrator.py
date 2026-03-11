import os
import unittest

from cogwar.innovation.countermeasure_orchestrator import (
    synthesize_countermeasure_playbook,
)


class CountermeasureOrchestratorTest(unittest.TestCase):
    def setUp(self) -> None:
        self._old_flag = os.environ.get("COGWAR_INNOVATION")
        if "COGWAR_INNOVATION" in os.environ:
            del os.environ["COGWAR_INNOVATION"]

    def tearDown(self) -> None:
        if self._old_flag is None:
            if "COGWAR_INNOVATION" in os.environ:
                del os.environ["COGWAR_INNOVATION"]
        else:
            os.environ["COGWAR_INNOVATION"] = self._old_flag

    def test_disabled_by_default(self) -> None:
        with self.assertRaises(PermissionError):
            synthesize_countermeasure_playbook([])

    def test_deterministic_budgeted_output(self) -> None:
        os.environ["COGWAR_INNOVATION"] = "true"
        indicators = [
            {
                "id": "IND-7",
                "name": "Narrative Shift",
                "severity": "high",
                "confidence": 0.9,
                "tags": ["narrative_shift", "amplification"],
            },
            {
                "id": "IND-2",
                "name": "Coordination Cluster",
                "severity": "medium",
                "confidence": 0.76,
                "tags": ["coordination", "credibility_attack"],
            },
        ]
        plan_one = synthesize_countermeasure_playbook(
            indicators, max_budget=8, max_actions=3
        )
        plan_two = synthesize_countermeasure_playbook(
            list(reversed(indicators)), max_budget=8, max_actions=3
        )

        self.assertEqual(plan_one, plan_two)
        self.assertEqual(plan_one["schema_version"], "cogwar.countermeasure_playbook.v1")
        self.assertGreaterEqual(plan_one["budget_used"], 1)
        self.assertGreaterEqual(plan_one["budget_remaining"], 0)
        self.assertLessEqual(plan_one["budget_used"], 8)
        self.assertLessEqual(len(plan_one["selected_actions"]), 3)
        self.assertTrue(any(item["phase"] == "immediate" for item in plan_one["selected_actions"]))


if __name__ == "__main__":
    unittest.main()
