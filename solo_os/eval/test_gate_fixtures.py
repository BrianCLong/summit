import os
import unittest

from solo_os.governance.gate import GovernanceGate


class TestGateFixtures(unittest.TestCase):
    def test_negative_fixture(self):
        policy_path = "solo_os/eval/fixtures/negative/policy.deny_all.json"
        gate = GovernanceGate(policy_path)
        self.assertFalse(gate.is_allowed("outbound"))
        self.assertFalse(gate.is_allowed("send_message", connector="slack"))

    def test_positive_fixture(self):
        policy_path = "solo_os/eval/fixtures/positive/policy.allow_outbound.json"
        gate = GovernanceGate(policy_path)
        self.assertTrue(gate.is_allowed("outbound"))
        self.assertTrue(gate.is_allowed("send_message", connector="slack"))

if __name__ == "__main__":
    unittest.main()
