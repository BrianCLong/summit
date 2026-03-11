import json
import os
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

from cogwar.innovation.adaptive_inoculation_graph import (
    FEATURE_FLAG,
    build_adaptive_inoculation_graph,
)
from cogwar.iw.warning import generate_warning
from cogwar.policy.intent import Intent


_SCHEMA_PATH = Path("schemas/cogwar/adaptive_inoculation_plan.schema.json")


class AdaptiveInoculationGraphTests(unittest.TestCase):
    def setUp(self) -> None:
        self._original_flag = os.environ.get(FEATURE_FLAG)
        self.indicators = [
            {
                "id": "ind-001",
                "severity": "critical",
                "confidence": 0.93,
                "channel": "social",
                "narrative_family": "energy-blackout",
                "velocity": 0.8,
                "novelty": 0.4,
            },
            {
                "id": "ind-002",
                "severity": "high",
                "confidence": 0.89,
                "channel": "social",
                "narrative_family": "energy-blackout",
                "velocity": 0.7,
                "novelty": 0.3,
            },
            {
                "id": "ind-003",
                "severity": "medium",
                "confidence": 0.72,
                "channel": "messaging",
                "narrative_family": "trust-erosion",
                "velocity": 0.5,
                "novelty": 0.2,
            },
        ]

    def tearDown(self) -> None:
        if self._original_flag is None:
            os.environ.pop(FEATURE_FLAG, None)
        else:
            os.environ[FEATURE_FLAG] = self._original_flag

    def test_requires_feature_flag(self) -> None:
        os.environ[FEATURE_FLAG] = "false"
        with self.assertRaises(PermissionError):
            build_adaptive_inoculation_graph(self.indicators)

    def test_rejects_offensive_intent(self) -> None:
        os.environ[FEATURE_FLAG] = "true"
        with self.assertRaises(PermissionError):
            build_adaptive_inoculation_graph(
                self.indicators,
                intent=Intent.OFFENSIVE_INFLUENCE,
            )

    def test_schema_valid_output(self) -> None:
        os.environ[FEATURE_FLAG] = "true"
        plan = build_adaptive_inoculation_graph(self.indicators, max_actions=2)

        schema = json.loads(_SCHEMA_PATH.read_text())
        validator = Draft202012Validator(schema)
        errors = sorted(validator.iter_errors(plan), key=lambda e: e.path)
        self.assertEqual(errors, [])
        self.assertLessEqual(len(plan["interventions"]), 2)
        self.assertEqual(plan["segments"][0]["channel"], "social")

    def test_warning_integration_enriches_actions(self) -> None:
        os.environ[FEATURE_FLAG] = "true"
        warning = generate_warning(self.indicators, intent=Intent.DEFENSIVE_IW)

        self.assertIn("adaptive_inoculation_plan", warning)
        self.assertGreater(
            len(warning["recommended_defensive_actions"]),
            2,
        )


if __name__ == "__main__":
    unittest.main()
