# summit/posture/wireless/tests/test_bluetooth_policy.py

import unittest
from summit.posture.wireless.policy_to_controls import PolicyToControls

class TestBluetoothPolicy(unittest.TestCase):
    def setUp(self):
        self.translator = PolicyToControls()

    def test_bluetooth_disable_advisory(self):
        advisory = "Recommendation: disable Bluetooth to prevent SIGINT eavesdropping."
        controls = self.translator.translate(advisory)
        self.assertEqual(len(controls), 1)
        self.assertEqual(controls[0]["control"], "disable_bluetooth")

    def test_unrelated_advisory(self):
        advisory = "Ensure all devices have the latest security patches."
        controls = self.translator.translate(advisory)
        self.assertEqual(len(controls), 0)

if __name__ == "__main__":
    unittest.main()
