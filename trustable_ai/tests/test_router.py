import unittest
import os
from trustable_ai.router import decide, RouterError

class TestRouter(unittest.TestCase):
    def setUp(self):
        self.policy = {
            "version": "1.0",
            "tiers": {
                "REFLEX": {"latency_budget_ms": 15},
                "STRATEGY": {}
            },
            "routes": [
                {
                    "name": "safe_reflex",
                    "tier": "REFLEX",
                    "risk": "low",
                    "requires_verification": False
                },
                {
                    "name": "dangerous_action",
                    "tier": "STRATEGY",
                    "risk": "high",
                    "requires_verification": True
                },
                {
                    "name": "invalid_high_risk",
                    "tier": "STRATEGY",
                    "risk": "high",
                    "requires_verification": False
                }
            ]
        }
        # Enable the feature for tests
        os.environ["TRUST_ROUTER_ENABLED"] = "1"

    def test_valid_route(self):
        decision = decide("safe_reflex", self.policy)
        self.assertEqual(decision.tier, "REFLEX")
        self.assertEqual(decision.risk, "low")

    def test_missing_route_raises_error(self):
        with self.assertRaises(RouterError):
            decide("non_existent", self.policy)

    def test_high_risk_requires_verification(self):
        # Should pass because it requires verification
        decide("dangerous_action", self.policy)

    def test_high_risk_missing_verification_raises_error(self):
        # Deny by default: high risk must verify
        with self.assertRaises(RouterError):
            decide("invalid_high_risk", self.policy)

if __name__ == "__main__":
    unittest.main()
