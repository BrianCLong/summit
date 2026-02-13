# summit/posture/wireless/tests/test_bluetooth_policy.py
import pytest
from summit.posture.wireless.policy_to_controls import WirelessPostureExporter

def test_bluetooth_advisory_translation():
    exporter = WirelessPostureExporter()
    advisory = "Due to security concerns, all officials must disable Bluetooth on their devices."
    controls = exporter.translate_advisory(advisory)

    assert len(controls) == 1
    assert controls[0]["control"] == "disable_bluetooth"
    assert controls[0]["priority"] == "high"

def test_no_advisory_translation():
    exporter = WirelessPostureExporter()
    advisory = "Everything is fine."
    controls = exporter.translate_advisory(advisory)

    assert len(controls) == 0
