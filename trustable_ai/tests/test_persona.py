import unittest
import time
import os
from trustable_ai.persona.guard import RefractoryGuard

class TestPersonaGuard(unittest.TestCase):
    def setUp(self):
        os.environ["TRUST_PERSONA_ENABLED"] = "1"

    def test_allow_first_call(self):
        guard = RefractoryGuard(refractory_ms=100)
        self.assertTrue(guard.allow())

    def test_block_rapid_succession(self):
        guard = RefractoryGuard(refractory_ms=500)
        self.assertTrue(guard.allow())
        self.assertFalse(guard.allow()) # Should be blocked immediately

    def test_allow_after_refractory(self):
        guard = RefractoryGuard(refractory_ms=10)
        self.assertTrue(guard.allow())
        time.sleep(0.02)
        self.assertTrue(guard.allow())

if __name__ == "__main__":
    unittest.main()
