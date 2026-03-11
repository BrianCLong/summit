import os
import unittest

from cogwar.iw.warning import generate_warning


class WarningCountermeasurePlaybookTest(unittest.TestCase):
    def setUp(self) -> None:
        self._old_flag = os.environ.get("COGWAR_INNOVATION")
        if "COGWAR_INNOVATION" in os.environ:
            del os.environ["COGWAR_INNOVATION"]
        self.indicators = [
            {
                "id": "IND-11",
                "name": "Coordination Burst",
                "severity": "high",
                "confidence": 0.88,
                "tags": ["coordination", "amplification"],
            }
        ]

    def tearDown(self) -> None:
        if self._old_flag is None:
            if "COGWAR_INNOVATION" in os.environ:
                del os.environ["COGWAR_INNOVATION"]
        else:
            os.environ["COGWAR_INNOVATION"] = self._old_flag

    def test_warning_without_innovation_flag(self) -> None:
        warning = generate_warning(self.indicators)
        self.assertIsNotNone(warning)
        self.assertNotIn("countermeasure_playbook", warning)

    def test_warning_with_innovation_flag(self) -> None:
        os.environ["COGWAR_INNOVATION"] = "true"
        warning = generate_warning(self.indicators)

        self.assertIn("countermeasure_playbook", warning)
        playbook = warning["countermeasure_playbook"]
        self.assertEqual(playbook["schema_version"], "cogwar.countermeasure_playbook.v1")

        selected_titles = [item["title"] for item in playbook["selected_actions"]]
        for title in selected_titles:
            self.assertIn(title, warning["recommended_defensive_actions"])


if __name__ == "__main__":
    unittest.main()
