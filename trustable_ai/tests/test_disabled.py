import unittest
import os
from trustable_ai.router import decide
from trustable_ai.persona.guard import RefractoryGuard
from trustable_ai.dvr_cycle import draft_verify_refine, VerificationResult

class TestDisabledFeatures(unittest.TestCase):
    def setUp(self):
        # Ensure flags are unset or 0
        if "TRUST_ROUTER_ENABLED" in os.environ:
            del os.environ["TRUST_ROUTER_ENABLED"]
        if "TRUST_PERSONA_ENABLED" in os.environ:
            del os.environ["TRUST_PERSONA_ENABLED"]
        if "TRUST_DVR_ENABLED" in os.environ:
            del os.environ["TRUST_DVR_ENABLED"]

    def test_router_disabled(self):
        # Should default to low risk / REFLEX / no verification
        decision = decide("any_route", {})
        self.assertEqual(decision.risk, "low")
        self.assertFalse(decision.requires_verification)

    def test_persona_disabled(self):
        # Should always allow
        guard = RefractoryGuard(refractory_ms=1000)
        self.assertTrue(guard.allow())
        self.assertTrue(guard.allow())

    def test_dvr_disabled(self):
        # Should return draft unverified
        def draft_fn(ctx): return "Draft"
        # Verifier that would fail if called
        class FailVerifier:
            def verify(self, d, c): raise Exception("Should not be called")

        res, vr = draft_verify_refine(draft_fn, None, FailVerifier(), {})
        self.assertEqual(res, "Draft")
        self.assertEqual(vr.reason, "Disabled")

if __name__ == "__main__":
    unittest.main()
