import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.insert(0, project_root)

from predictive_threat_suite.causal_explainer import get_causal_explanation
from predictive_threat_suite.counterfactual_simulator import (
    enable_counterfactual_simulator_feature,
    simulate_counterfactual,
)
from predictive_threat_suite.timeline_forecast import (
    enable_timeline_forecast_feature,
    get_timeline_forecast,
)


class TestPredictiveSuiteStubs(unittest.TestCase):

    def test_get_timeline_forecast_enhanced(self):
        entity_id = "threat_actor_X"
        start_date = "2025-01-01"
        end_date = "2025-01-03"
        forecast = get_timeline_forecast(entity_id, start_date, end_date)

        self.assertIsInstance(forecast, list)
        self.assertEqual(len(forecast), 3)  # 3 days

        # Check specific values based on the linear trend (initial_value=10.0, trend_slope=0.5)
        self.assertEqual(forecast[0]["date"], "2025-01-01")
        self.assertEqual(forecast[0]["value"], 10.0)

        self.assertEqual(forecast[1]["date"], "2025-01-02")
        self.assertEqual(forecast[1]["value"], 10.5)  # 10.0 + 1 * 0.5

        self.assertEqual(forecast[2]["date"], "2025-01-03")
        self.assertEqual(forecast[2]["value"], 11.0)  # 10.0 + 2 * 0.5

    def test_enable_timeline_forecast_feature(self):
        self.assertTrue(enable_timeline_forecast_feature(True))
        self.assertFalse(enable_timeline_forecast_feature(False))

    def test_simulate_counterfactual_enhanced(self):
        # Scenario 1: High threat, deploy patch -> mitigated
        scenario1 = {"threat_level": "high"}
        intervention1 = {"action": "deploy_patch"}
        result1 = simulate_counterfactual(scenario1, intervention1)
        self.assertEqual(result1["outcome"], "threat_mitigated")
        self.assertEqual(result1["impact"], "positive")

        # Scenario 2: Medium threat, monitor -> contained
        scenario2 = {"threat_level": "medium"}
        intervention2 = {"action": "monitor"}
        result2 = simulate_counterfactual(scenario2, intervention2)
        self.assertEqual(result2["outcome"], "threat_contained")
        self.assertEqual(result2["impact"], "neutral")

        # Scenario 3: High threat, do nothing -> escalated
        scenario3 = {"threat_level": "high"}
        intervention3 = {"action": "do_nothing"}
        result3 = simulate_counterfactual(scenario3, intervention3)
        self.assertEqual(result3["outcome"], "threat_escalated")
        self.assertEqual(result3["impact"], "negative")

        # Scenario 4: Unknown scenario
        scenario4 = {"threat_level": "low"}
        intervention4 = {"action": "ignore"}
        result4 = simulate_counterfactual(scenario4, intervention4)
        self.assertEqual(result4["outcome"], "unknown")
        self.assertEqual(result4["impact"], "neutral")

    def test_enable_counterfactual_simulator_feature(self):
        self.assertTrue(enable_counterfactual_simulator_feature(True))
        self.assertFalse(enable_counterfactual_simulator_feature(False))

    def test_get_causal_explanation(self):
        event = {"type": "alert", "id": "alert1"}
        context = {"time": "now"}
        explanation = get_causal_explanation(event, context)
        self.assertIsInstance(explanation, list)
        self.assertGreater(len(explanation), 0)


if __name__ == "__main__":
    unittest.main()
