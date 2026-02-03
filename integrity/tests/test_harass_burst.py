import os
from unittest import mock

from integrity.detectors.harass_burst import detect


def test_harass_burst_disabled_by_default():
    sig = {"targeting_bursts": [{"actor_count": 20, "target_id": "u1"}]}
    with mock.patch.dict(os.environ, {"INTEGRITY_HARASS_DETECTOR_ENABLED": "false"}):
        assert detect(sig) == []

def test_harass_burst_enabled_positive():
    sig = {"targeting_bursts": [{"actor_count": 20, "target_id": "u1"}]}
    with mock.patch.dict(os.environ, {"INTEGRITY_HARASS_DETECTOR_ENABLED": "true"}):
        out = detect(sig)
        assert len(out) == 1
        assert out[0].detector == "harass_burst"
        assert out[0].score == 20.0
