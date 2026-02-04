import unittest
from typing import Dict, Any
import os
from trustable_ai.dvr_cycle import draft_verify_refine, VerificationResult

class MockVerifier:
    def __init__(self, should_pass: bool):
        self.should_pass = should_pass

    def verify(self, draft: str, context: Dict[str, Any]) -> VerificationResult:
        if self.should_pass:
            return VerificationResult(ok=True, reason="OK", details={})

        # Check if it was refined (simple check for prefix)
        if draft.startswith("Refined:"):
            return VerificationResult(ok=True, reason="Refined OK", details={})

        return VerificationResult(ok=False, reason="Failed", details={})

class TestDVRCycle(unittest.TestCase):
    def setUp(self):
        os.environ["TRUST_DVR_ENABLED"] = "1"

    def test_pass_first_try(self):
        verifier = MockVerifier(should_pass=True)
        def draft_fn(ctx): return "Draft"
        def refine_fn(d, vr, ctx): return "Refined: " + d

        result, vr = draft_verify_refine(draft_fn, refine_fn, verifier, {})
        self.assertEqual(result, "Draft")
        self.assertTrue(vr.ok)

    def test_refine_on_failure(self):
        verifier = MockVerifier(should_pass=False)
        def draft_fn(ctx): return "Draft"
        def refine_fn(d, vr, ctx): return "Refined: " + d

        result, vr = draft_verify_refine(draft_fn, refine_fn, verifier, {})
        self.assertEqual(result, "Refined: Draft")
        self.assertTrue(vr.ok)

if __name__ == "__main__":
    unittest.main()
